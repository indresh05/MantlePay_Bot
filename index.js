import TelegramBot from "node-telegram-bot-api";
import { ethers } from "ethers";
import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const abi = JSON.parse(
  fs.readFileSync(new URL("./abi.json", import.meta.url), "utf8")
);

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

// Quick runtime validation: ensure required contract methods exist in the ABI
const requiredFns = [
  "linkWallet",
  "schedulePayment",
  "payments",
  "executePayment",
];

const missing = requiredFns.filter((fn) => typeof contract[fn] !== "function");
if (missing.length > 0) {
  console.error("ABI validation failed: missing contract functions ->", missing.join(", "));
  console.error(
    "The loaded ABI (./abi.json) doesn't include the functions this bot expects.\nPlease provide the correct contract ABI that defines:",
    requiredFns.join(", ")
  );
  process.exit(1);
}

const userWallets = new Map(); // username => ethers.Wallet
const userStates = new Map(); // chatId => { step, username, role }

// ---------------- START COMMAND ----------------
bot.onText(/\/start/, (msg) => {
  const commands = `
Available commands:
/start - Show this list
/link - Link your wallet (sender: enter private key; recipient: enter wallet address)
/sendnow @username amount - Send MNT immediately
/schedule @username amount delay_minutes - Schedule send
  `;
  bot.sendMessage(msg.chat.id, commands);
});

// ---------------- LINK WALLET ----------------
bot.onText(/\/link/, (msg) => {
  const username = msg.from.username;
  if (!username) {
    return bot.sendMessage(msg.chat.id, "Please set a Telegram username first");
  }

  userStates.set(msg.chat.id, { step: 'choose_role', username });
  bot.sendMessage(msg.chat.id, "Are you a sender or recipient? Reply with 'sender' or 'recipient'");
});

// Handle user responses for linking
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const state = userStates.get(chatId);
  if (!state || !msg.text) return;

  const text = msg.text.trim();

  // -------- CHOOSE ROLE --------
  if (state.step === "choose_role") {
    if (text.toLowerCase() === "sender") {
      state.step = "sender_key_choice";
      state.role = "sender";
      bot.sendMessage(
        chatId,
        "Sender selected.\nReply with:\n1️⃣ demo (use bot wallet)\n2️⃣ custom (enter your own private key)"
      );
    } else if (text.toLowerCase() === "recipient") {
      state.step = "recipient_address";
      state.role = "recipient";
      bot.sendMessage(
        chatId,
        "Recipient selected.\nEnter your wallet address to link with your Telegram username:"
      );
    } else {
      bot.sendMessage(chatId, "Reply with 'sender' or 'recipient'");
    }
    return;
  }

  // -------- SENDER FLOW --------
  if (state.step === "sender_key_choice") {
    if (text.toLowerCase() === "demo") {
      userWallets.set(state.username, {
        type: "wallet",
        wallet: wallet, // bot executor wallet
      });
      bot.sendMessage(chatId, "Demo wallet selected. You can now send payments.");
      userStates.delete(chatId);
    } else if (text.toLowerCase() === "custom") {
      state.step = "sender_private_key";
      bot.sendMessage(chatId, "Enter your private key:");
    } else {
      bot.sendMessage(chatId, "Reply with 'demo' or 'custom'");
    }
    return;
  }

  if (state.step === "sender_private_key") {
    try {
      const userWallet = new ethers.Wallet(text, provider);
      userWallets.set(state.username, { type: "wallet", wallet: userWallet });
      bot.sendMessage(chatId, "Sender wallet linked locally. Ready to send.");
    } catch {
      bot.sendMessage(chatId, "Invalid private key");
    }
    userStates.delete(chatId);
    return;
  }

  // -------- RECIPIENT FLOW (ADDRESS-BASED LINK) --------
  if (state.step === "recipient_address") {
    try {
      const walletAddress = ethers.getAddress(text); // validates checksum

      const tx = await contract.linkWallet(state.username, walletAddress);
      await tx.wait();

      bot.sendMessage(
        chatId,
        "Wallet address successfully linked on-chain to your Telegram username"
      );
    } catch {
      bot.sendMessage(chatId, "Invalid wallet address or transaction failed");
    }
    userStates.delete(chatId);
  }
});



// ---------------- SEND NOW ----------------
bot.onText(/\/sendnow @(\w+) ([0-9.]+)/, async (msg, match) => {
  const senderUsername = msg.from.username;
  if (!senderUsername) {
    return bot.sendMessage(msg.chat.id, "Please set a Telegram username first");
  }

  const senderData = userWallets.get(senderUsername);
  if (!senderData || senderData.type !== "wallet") {
    return bot.sendMessage(msg.chat.id, "Please link your wallet first with /link");
  }

  const tgUser = match[1];
  const amount = ethers.parseEther(match[2]);
  const executeAfter = Math.floor(Date.now() / 1000);

  // 🔐 On-chain check. Is recipient linked
  const hash = ethers.keccak256(ethers.toUtf8Bytes(tgUser));
  const linkedWallet = await contract.tgToWallet(hash);

  if (linkedWallet === ethers.ZeroAddress) {
    return bot.sendMessage(
      msg.chat.id,
      `@${tgUser} has not linked a wallet yet. Ask them to run /link`
    );
  }

  const userContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    abi,
    senderData.wallet
  );

  const tx = await userContract.schedulePayment(
    tgUser,
    ethers.ZeroAddress,
    amount,
    executeAfter,
    { value: amount }
  );

  await tx.wait();

  const explorerUrl = `https://sepolia.mantle.xyz/tx/${tx.hash}`;

  bot.sendMessage(
    msg.chat.id,
    `✅ Payment sent\n\n` +
    `👤 To: @${tgUser}\n` +
    `💰 Amount: ${match[2]} MNT\n` +
    `🔗 Tx Hash:\n${tx.hash}\n\n` +
    `🌐 View on Explorer:\n${explorerUrl}\n\n` +
    `ℹ️ Funds will reach the wallet shortly after on-chain execution`
  );
});



bot.onText(/\/schedule @(\w+) ([0-9.]+) (\d+)/, async (msg, match) => {
  const senderUsername = msg.from.username;
  if (!senderUsername) {
    return bot.sendMessage(msg.chat.id, "Please set a Telegram username first");
  }

  const senderData = userWallets.get(senderUsername);
  if (!senderData || senderData.type !== "wallet") {
    return bot.sendMessage(msg.chat.id, "Please link your wallet first with /link");
  }

  const tgUser = match[1];
  const amount = ethers.parseEther(match[2]);
  const delayMinutes = Number(match[3]);

  const executeAfter =
    Math.floor(Date.now() / 1000) + delayMinutes * 60;

  // 🔐 On-chain check. Is recipient linked
  const hash = ethers.keccak256(ethers.toUtf8Bytes(tgUser));
  const linkedWallet = await contract.tgToWallet(hash);

  if (linkedWallet === ethers.ZeroAddress) {
    return bot.sendMessage(
      msg.chat.id,
      `@${tgUser} has not linked a wallet yet. Ask them to run /link`
    );
  }

  const userContract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    abi,
    senderData.wallet
  );

  const tx = await userContract.schedulePayment(
    tgUser,
    ethers.ZeroAddress,
    amount,
    executeAfter,
    { value: amount }
  );

  await tx.wait();
  bot.sendMessage(
    msg.chat.id,
    `Scheduled ${match[2]} MNT to @${tgUser} in ${delayMinutes} minutes`
  );
});


// ---------------- AUTO EXECUTOR ----------------
cron.schedule("* * * * *", async () => {
  const total = Number(await contract.paymentsCount());
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < total; i++) {
    const p = await contract.payments(i);

    if (!p.executed && p.executeAfter <= now) {
      try {
        const tx = await contract.executePayment(i);
        await tx.wait();
        console.log("Executed payment:", i);
      } catch (e) {
        console.error("Execution failed:", e.message);
      }
    }
  }
});

