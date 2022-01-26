// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import '@openzeppelin/contracts/access/Ownable.sol';


contract FungibleToken is ERC20, Ownable {

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) public ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    function mint(uint256 num) public {
        _mint(msg.sender, num);
    }


}
