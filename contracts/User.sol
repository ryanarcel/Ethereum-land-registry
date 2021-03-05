pragma solidity ^0.5.0;

contract User{
    
    mapping (address=>string) public credentials;

    constructor() public {
        setSuperAdmin(msg.sender, "inspector");
    }
    
    function setSuperAdmin( address _addr, string memory _cred) public{
        credentials[_addr] = _cred;
    }
    function getCredential(address _addr) public view returns (string memory){
        return credentials[_addr];
    }

    function getSender() public view returns (address){
        return msg.sender;
    }

    

}