App = {
    web3Provider: null,
    contracts: {},

    init: async function() {
          return await App.initWeb3();
    },

    initWeb3: async function() {
          if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
              // Request account access
              await window.ethereum.enable();
            } catch (error) {
              // User denied account access...
              console.error("User denied account access")
            }
          }
          else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
          }
          else {
            App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
          }
          web3 = new Web3(App.web3Provider);

          return App.initContract();
    },

    initContract: function() {
          $.getJSON('LandRegistration.json', function(data) {  
            var LandRegistrationArtifact = data;
            App.contracts.LandRegistration = TruffleContract(LandRegistrationArtifact);
            App.contracts.LandRegistration.setProvider(App.web3Provider);
          });
          
          $.getJSON('User.json', function(data) {  
            var UserArtifact = data;
            App.contracts.User = TruffleContract(UserArtifact);
            App.contracts.User.setProvider(App.web3Provider);
          });

          
    },

    checkLogin: function(){
          web3.eth.getAccounts(function(err, accounts){
            if (err != null){
                console.log("An error occurred: "+err);
                alert("An error occurred: "+err);
            }
            else if (accounts.length == 0){
                alert("User is not logged in to Ethereum Wallet");
            }
            else{
                return App.checkCredentials(accounts[0]);
            }
          });
    },

    checkCredentials: async function(acct){
      // console.log("account: "+ acct);
        let User = await App.contracts.User.deployed();
        let cred = await User.getCredential(acct);
        let LanReg = await App.contracts.LandRegistration.deployed();
        let cred2 = await LanReg.checkIfOwnerExists(acct);

      
          if (cred == "inspector"){
            console.log(cred);
            sessionStorage.setItem("account", cred);
            window.location.replace("inspector-home.html");
          }
          else if(cred2 == true){
            console.log(cred2);
            sessionStorage.setItem("account", "owner");
            window.location.replace("owner-home.html");
          }
          else{
            console.log(acct);
          }
        
    },

    monitorSession: function(event){
        console.log("Session: "+sessionStorage.getItem("account"));
        if(sessionStorage.getItem("account") == null){
            window.location.replace("index.html");
        }
    },

    displayRecordsFromJSON: function(){
        $.getJSON( "land.json", function(data) {  
          //console.log(data.length);
          for(var i =0; i<data.length; i++){
            let elements = "<tr>"+
              "<td>"+data[i].id+"</td>"+
              "<td>"+data[i].surveyNo+"</td>"+
              "<td>"+data[i].complete_location+", "+data[i].village+",<br> Brgy. "+data[i].barangay+",<br> "+data[i].citymunicipality+", "+data[i].province+"</td>"+
              "<td>"+data[i].area+"   sqm</td>"+
              "<td><a href='#' onClick='App.getOnwersAddress(this)' data='"+data[i].id+"' class='getOwnersAddress btn btn-info text-white'>Pull from Blockchain</a></td>"+
            "</tr>";
    
            $('#tableBody').append(elements);
          }
        });  
    },
        
    getOnwersAddress: async function(element){
            let data = $(element).attr('data');
            let lanreg = await App.contracts.LandRegistration.deployed();
            let res = await lanreg.getLandOwner(data);
            //alert(res);
            $('.modal-body p').html(res);
            $('.modal').fadeIn(300);
    },

    encryptAndStore : function(){
        //to be hashed (specific to land)
          let surveyNo = $("#surveyNo").val();
          let area = $("#area").val();
          let completeLoc = $("#completeLoc").val();
          let village = $("#village").val();
          let brgy = $("#brgy").val();
          let cityMun = $("#cityMun").val();
          let province= $("#province").val();

          //not to be hashed (changeable) 
          let owner = $("#owner").val();
          let dateOfReg = $("#dateOfReg").val();
          let marketVal = $("#marketVal").val();

          //combines data to be hashed
          let combined = surveyNo + area + completeLoc +  village  + brgy + cityMun+ province ;
          console.log(combined);

          //sha256 hash
          let encrypted = CryptoJS.SHA256(combined);
          //ecoded to hexadecimal string
          let hash = encrypted.toString(CryptoJS.enc.Hex);
          console.log("hash: "+hash);
          //converts hexadecimal string to int, gets remainder by 1000000000 to generate id 
          let id = parseInt(hash,16)%1000000000 ;
          console.log("Parse Int: "+ id);

          if(id == "" || surveyNo == "" || area == "" || completeLoc == "" || village == "" || brgy == "" ||
            cityMun == "" || owner == "" || marketVal == "" || dateOfReg == ""){
              alert("Please fill up every field.");
          }
          else{
              dateOfReg = App.handleDate(dateOfReg);
            
                App.registerLand(
                  area,
                  hash,
                  surveyNo,
                  owner,
                  dateOfReg,
                  marketVal,
                  id
                );  
            
                  $.getJSON( "land.json", function(data) {  
                    let obj = {
                        "id" : id,
                        "surveyNo": surveyNo,
                        "area": area,
                        "complete_location": completeLoc,
                        "village": village,
                        "barangay": brgy,
                        "citymunicipality": cityMun,
                        "province": province,
                        "registration date": dateOfReg
                    }

                  // console.log(data)
                      // add a new land to the set
                      data.push(obj);      
                      let newData = JSON.stringify(data);

                      jQuery.post('http://127.0.0.1/dapp/saveJson.php',{
                        newData: newData
                      }, function(res){
                            // console.log(res.message)
                      }).fail(function(err){
                          console.log("JSON Error:" + err.message);
                      });                
                    
                  });
          }  
    },

    registerLand: async function(
          _area,
          _infoHash,
          _surveyNo,
          _OwnerAddress,
          _dateOfReg,
          _marketValue,
          _id){

            let account;
            web3.eth.getAccounts(function(error, accounts) {
              if (error) {
                console.log(error);
              }
              else{
                account = accounts[0];
              }
            });

          //gets credential of current address
          let User = await App.contracts.User.deployed()
          let cred = await User.getCredential(account);
          App.contracts.LandRegistration.deployed().then(function(instance){
            instance.Registration(
              _area,
              _infoHash,
              _surveyNo,
              _OwnerAddress,
              _dateOfReg,
              _marketValue,
              _id,
              cred, 
              {from: account});
          });
         // window.location.replace("inspector-home.html");
        },

    handleDate: function(date){
      let newdate = new Date(date).getTime();
      let birthDateInUnixTimestamp = newdate / 1000;
      return birthDateInUnixTimestamp;
    },

    //=============Owner================//

    //get Assets
    pullAssets: async function(element){
      $(element).fadeOut(300);
      $("#wel").fadeOut(300);
      $("#come").fadeOut(300);
      let LanReg = await App.contracts.LandRegistration.deployed();
      let assets = await LanReg.viewAssets.call();
    // console.log(assets[i]);
    
      for(var i=0; i <assets.length; i++){
        //  console.log(assets[i].c[0]);
          let landId = assets[i].c[0];
          let res = await LanReg.landInfoOwner(landId);
          //console.log(res);

              let availableButton = "";
              //let editMarketValue = "<button onclick='App.updateValue("+landId+")' class='btn btn-success'>Update Market Value</button>"

              if(!res[3]){
                availableButton = "<button onclick='App.makeAvailable("+landId+")' class='btn btn-info' data-toggle='tooltip' data-placement='right' title='Make available for sale.'>Make Available</button>";
              }
              else{
                availableButton = "<button onclick='App.makeAvailable("+landId+")' class='btn btn-primary'>Available for Sale</button>";
              }

              let element = "<div class='col-md-4 assets' style='display:none'>"+
              "<div class='card mb-2' style='width: 18rem;'>"+
                "<div class='card-header bg-danger text-white'>"+
                  "Land Asset <span ><b>"+landId+"</b></span>"+
                "</div>"+
                "<div class='card-body'>"+
                  "<p >Survey Number <span class='text-info font-weight-bold'>"+res[2]+"</span></p>"+
                  "<p > Area: <span class='text-info font-weight-bold'>"+res[0]+" sqm</span></p>"+
                  "<label id='info"+landId+"'>Info Hash:</label> <p class='text-info font-weight-bold' id='infoHash"+landId+"'><a href='#' id='theHash' onclick='App.verifyHash(\""+res[1]+"\", "+landId+")' style='text-decoration:none' data-toggle='tooltip' data-placement='right' title='Verify hash and view details.'>"+res[1]+"</a></p></div>"+
                  "<button onclick='App.getValue("+landId+")' class='btn btn-success'>Update Market Value</button>"+
                   availableButton+
                "</div>"+
                "</div>";

                  $('#assetList').append(element);
                  $('.assets').delay(300).fadeIn(300);
                
      } //close for loop
    },

    makeAvailable: async function(id){

        let account;
        web3.eth.getAccounts(function(error, accounts) {
          if (error) {
            console.log(error);
          }
          else{
            account = accounts[0];
          }
        });

        App.contracts.LandRegistration.deployed().then(function(instance){
          instance.makeAvailable(id, {from: account});
          location.reload();
        }).fail(function(){
          alert("An error occured.")
        });
        
    },

    verifyHash: function(_hash, _id){

        $.getJSON( "land.json", function(data) {
          
          for(var i =0; i<data.length; i++){
            if(data[i].id == _id){
              console.log("Found it: "+data[i].surveyNo);
              let surveyNo = data[i].surveyNo;
              let area = data[i].area;
              let completeLoc = data[i].complete_location;
              let village = data[i].village;
              let brgy = data[i].barangay;
              let cityMun = data[i].citymunicipality;
              let province = data[i].province;

              let combined = surveyNo + area + completeLoc +  village  + brgy + cityMun+ province;
              console.log("combined: "+combined);
              //sha256 hash
              let encrypted = CryptoJS.SHA256(combined);
              //ecoded to hexadecimal string
              let hash = encrypted.toString(CryptoJS.enc.Hex);

              console.log("Blockchian: " +_hash);
              console.log("JSON:       "+hash);

              let details = completeLoc +  ", " +village +", Brgy." + brgy +", " + cityMun +", "+ province;

              if(_hash === hash){
                $("#info"+_id).html("<h6 class='text-success'><b>Verified Details:</h6>");
                $('#infoHash'+_id).html( details);
                $('#details').html("<h3>"+ details+"</h3>");
                $('#detailsModal').fadeIn(300);
              }
            }
          }

        });
    },

    getValue: async function(id){
      let LanReg = await App.contracts.LandRegistration.deployed();
      let oldValue = await LanReg.getMarketValue(id);
      $('#value').val(oldValue);
      $('#id').val(id);
      console.log("Value: " +oldValue);
      $('#valueModal').fadeIn(300);
    },

    updateValue: async function(newVal, id){
      let account;
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        else{
          account = accounts[0];
        }
      });

      App.contracts.LandRegistration.deployed().then(function(instance){
        instance.updateMarketValue(id, newVal, {from: account});
        location.reload();
      });
    },

    hookBuyerAccount: function(){
      sessionStorage.setItem("account", "buyer");
      window.location.replace("buyer-home.html");
    }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
