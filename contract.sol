// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MantlePayBot {
    struct ScheduledPayment {
        address sender;
        address token; // address(0) = MNT
        address recipient;
        uint256 amount;
        uint256 executeAfter;
        bool executed;
    }

    // telegram username hash -> wallet
    mapping(bytes32 => address) public tgToWallet;

    ScheduledPayment[] public payments;

    event WalletLinked(bytes32 tgHash, address wallet);
    event PaymentScheduled(uint256 id);
    event PaymentExecuted(uint256 id);

    // ✅ UPDATED FUNCTION
    function linkWallet(string calldata tgUsername, address wallet) external {
        require(wallet != address(0), "Invalid wallet");
        bytes32 tgHash = keccak256(bytes(tgUsername));
        tgToWallet[tgHash] = wallet;
        emit WalletLinked(tgHash, wallet);
    }

    function schedulePayment(
        string calldata tgUsername,
        address token,
        uint256 amount,
        uint256 executeAfter
    ) external payable {
        bytes32 tgHash = keccak256(bytes(tgUsername));
        address recipient = tgToWallet[tgHash];
        require(recipient != address(0), "Wallet not linked");

        if (token == address(0)) {
            require(msg.value == amount, "Invalid MNT amount");
        } else {
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        payments.push(
            ScheduledPayment(
                msg.sender,
                token,
                recipient,
                amount,
                executeAfter,
                false
            )
        );

        emit PaymentScheduled(payments.length - 1);
    }

    function executePayment(uint256 id) external {
        ScheduledPayment storage p = payments[id];
        require(!p.executed, "Already executed");
        require(block.timestamp >= p.executeAfter, "Too early");

        p.executed = true;

        if (p.token == address(0)) {
            payable(p.recipient).transfer(p.amount);
        } else {
            IERC20(p.token).transfer(p.recipient, p.amount);
        }

        emit PaymentExecuted(id);
    }
    
    function paymentsCount() external view returns (uint256) {
        return payments.length;
    }
}


