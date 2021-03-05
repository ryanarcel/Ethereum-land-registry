pragma solidity >=0.4.0 <0.6.0;

//Land Details
contract LandRegistration{
    //User user = User();

    struct landDetails{
        uint area;
        string infoHash;
        string surveyNumber;
        address payable CurrentOwner;
        uint marketValue;
        uint64 dateOfReg;
        bool isAvailable;
        address requester;
        reqStatus requestStatus;
    }
    
    //request status
    enum reqStatus {Default,pending,reject,approved}

    //profile of a client
    struct profiles{
        uint64[] assetList;   
    }

    mapping(uint => landDetails) land;
    address owner;
    mapping(address => profiles) profile;
    
    //contract owner
    constructor() public{
        owner = msg.sender;
    }
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    struct transact{
      address acctFrom;
      address acctTo;
      uint64 date;
    }
  
    mapping (uint => transact) transaction;

    //Registration of land details.
    function Registration(
        uint _area,
        string memory _infoHash,
        string memory _surveyNumber,
        address payable _OwnerAddress,
        uint64 _dateOfReg,
        uint _marketValue,
        uint64 id,
        string memory _cred
        ) public returns(bool ) {
            require(keccak256(abi.encodePacked(_cred)) ==
            keccak256(abi.encodePacked("inspector")));
            land[id].area = _area;
            land[id].infoHash = _infoHash;
            land[id].surveyNumber = _surveyNumber;
            land[id].CurrentOwner = _OwnerAddress;
            land[id].dateOfReg = _dateOfReg;
            land[id].marketValue = _marketValue;
            profile[_OwnerAddress].assetList.push(id);              //stores owner address in 'profile,' with land id in asset
            return true;
    }

    //gets owner's address to display on webpage
    function getLandOwner(uint64 id) public view returns(address){
        return(land[id].CurrentOwner);
    }

    function checkIfOwnerExists(address _address)
    public view returns (bool){
        if (profile[_address].assetList.length > 0){
            return true;
        }
        return false;
    }

   //will show assets of the function caller 

    function viewAssets(address _address)
    public view returns(uint64[] memory){
        return (profile[_address].assetList);
    }

    

    //to view details of land for the owner

    function landInfoOwner(uint64 id)
    public view returns(
        uint,
        string memory,
        string memory,
        bool,
        address,
        reqStatus){
        return(
            land[id].area,
            land[id].infoHash,
            land[id].surveyNumber,
            land[id].isAvailable,
            land[id].requester,
            land[id].requestStatus
        );
    }

        //to view details of land for the buyer

    function landInfoBuyer(uint64 id)
    public view returns(
        address,
        uint,
        bool,
        address,
        reqStatus){
        return(
            land[id].CurrentOwner,
            land[id].marketValue,
            land[id].isAvailable,
            land[id].requester,
            land[id].requestStatus
        );
    }

     //availing land for sale.

    function makeAvailable(uint64 property)public{
        require(land[property].CurrentOwner == msg.sender);
        if(land[property].isAvailable == false){
            land[property].isAvailable = true;
        }
        else{
            land[property].isAvailable = false;
        }
    } 

    function checkIfForSale(uint64 property)
    public view returns(bool){
        return land[property].isAvailable;
    }

    //get market value
    function getMarketValue(uint64 id) public view returns(uint){
        return land[id].marketValue;
    }

    //update Market 
    
    function updateMarketValue(uint64 id, uint newPrice)
    public{
        require(land[id].CurrentOwner == msg.sender);
        land[id].marketValue = newPrice;
    }

    function requestToLandOwner(uint id) public {
        require(land[id].isAvailable);
        land[id].requester=msg.sender;
        land[id].isAvailable=false;
        land[id].requestStatus = reqStatus.pending; 
    }
    

    // to compute id for a land.
    function computeId(string memory _city,string memory _district,string memory _village,string memory _surveyNumber) public view returns(uint){
        return uint(keccak256(abi.encodePacked(_city,_district,_village,_surveyNumber)))%10000000000000;
    }

    //processing request for the land by accepting or rejecting

    function processRequest(uint64 property,reqStatus status)
    public {
        require(land[property].CurrentOwner == msg.sender);
        land[property].requestStatus=status;
        if(status == reqStatus.reject){
            land[property].requester = address(0);
            land[property].requestStatus = reqStatus.Default;
        }
    }
   
    //buying the approved property

    function buyProperty(uint64 property, uint64 date)
    public payable{
        require(land[property].requestStatus == reqStatus.approved);
        uint price = land[property].marketValue;
        uint oneEth = 1 ether; // Or finney or...
        uint ethPrice = price * oneEth;
        
        require(msg.value >= ethPrice);
        land[property].CurrentOwner.transfer(ethPrice);
        
        setTransaction(property, land[property].CurrentOwner, msg.sender, date);

        removeOwnership(land[property].CurrentOwner,property);
        land[property].CurrentOwner=msg.sender;
        land[property].isAvailable=false;
        land[property].requester = address(0);
        land[property].requestStatus = reqStatus.Default;
        profile[msg.sender].assetList.push(property);
        
    }


    //removing the ownership of seller for the land. and it is called by the buyProperty function

    function removeOwnership(address previousOwner,uint id) private{
        uint index = findId(id,previousOwner);
        profile[previousOwner].assetList[index] = profile[previousOwner]
        .assetList[profile[previousOwner]
        .assetList.length-1];
        delete profile[previousOwner]
        .assetList[profile[previousOwner]
        .assetList.length-1];
        profile[previousOwner]
        .assetList.length--;
    }

    //for finding the index of a particular id

    function findId(uint id,address user)
    public view returns(uint){
        uint i;
        for(i=0;i<profile[user].assetList.length;i++){
            if(profile[user].assetList[i] == id)
                return i;
        }
        return i;
    }

    function setTransaction(uint64 id,
    address _acctFrom,
    address _acctTo,
    uint64 _date)
    public returns (bool){
      transaction[id].acctFrom = _acctFrom;
      transaction[id].acctTo = _acctTo;
      transaction[id].date = _date;
      return true;
    }

    function getTransaction(uint64 id) public view returns (address,address,uint64){
      return (
          transaction[id].acctTo,
          transaction[id].acctFrom,
          transaction[id].date
      );
    }
}