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
           // App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
           App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
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
        console.log(cred)
      
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

    encryptAndStore : async function(){
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
          let ownerName = $("#ownerName").val();
          let dateOfReg = $("#dateOfReg").val();
          let marketVal = $("#marketVal").val();

          //combines data to be hashed
          let combined = surveyNo.toLowerCase()  + 
                       area.toLowerCase() + 
                       completeLoc.toLowerCase() +
                       village.toLowerCase() +
                       brgy.toLowerCase() + 
                       cityMun.toLowerCase() +
                       province.toLowerCase() ;

          combined = combined.replace(/\s+/g, '');
          combined = combined.split('.').join("");
          combined = combined.split(',').join("");
          combined = combined.split('-').join("");

          let combined2 = owner + ownerName;
          console.log(combined);

          //sha256 hash
          let encrypted = CryptoJS.SHA256(combined);
          let encrypted2 = CryptoJS.SHA256(combined2);
          //ecoded to hexadecimal string
          let hash = encrypted.toString(CryptoJS.enc.Hex);
          let hash2 = encrypted2.toString(CryptoJS.enc.Hex);
          console.log("hash: "+hash);
          //converts hexadecimal string to int, gets remainder by 1000000000 to generate id 
          let id = parseInt(hash,16)%1000000000000 ;
          let ownerId = parseInt(hash2,16)%1000000000000 ;
          console.log("Parse Int: "+ id);

              dateOfReg = App.handleDate(dateOfReg);
            
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
                  area,
                  hash,
                  surveyNo,
                  owner,
                  dateOfReg,
                  marketVal,
                  id,
                  cred, 
                  {from: account});
    
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
                        "registration_date": dateOfReg
                    }
  
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

                  $.getJSON( "owners.json", function(data) {  
                    let obj = {
                        "id" : ownerId,
                        "owner": ownerName,
                        "address": owner,
                      
                    }
  
                      data.push(obj);      
                        let newData = JSON.stringify(data);
  
                        jQuery.post('http://127.0.0.1/dapp/saveJson2.php',{
                          newData: newData
                        }, function(res){
                              // console.log(res.message)
                        }).fail(function(err){
                            console.log("JSON Error:" + err.message);
                        });                
                      
                  });
              }).then(function(){
                //location.reload();
              }); 
    },

    encryptProper: function(){

    },

    handleDate: function(date){
      let newdate = new Date(date).getTime();
      let dateInUnixTimestamp = newdate / 1000;
      return dateInUnixTimestamp;
    },

    convertUnixtoDate: function(unix){
      const unixTimestamp = unix;

      const milliseconds = unixTimestamp * 1000 // 1575909015000
      
      const dateObject = new Date(milliseconds);
      let humanDateFormat = dateObject.toLocaleString();
      console.log(humanDateFormat);
      return humanDateFormat;
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
          
          requester = res[4];
          console.log(requester);

              let availableButton = "";
              //let editMarketValue = "<button onclick='App.updateValue("+landId+")' class='btn btn-success'>Update Market Value</button>"

              if(!res[3] && requester != 0x0000000000000000000000000000000000000000){
                  
                    availableButton =  "<button onclick='App.viewRequest("+landId+")' id='reqBtn' class='btn btn-light' data-toggle='tooltip' data-placement='right' title='View Requester'>View Pending Request</button>";
              }
              else if (!res[3] && requester == 0x0000000000000000000000000000000000000000){
                    availableButton = "<button onclick='App.makeAvailable("+landId+")' id='availableButton' class='btn btn-info' data-toggle='tooltip' data-placement='right' title='Make available for sale.'>Make Available</button>";
              }
              else{
                  availableButton = "<button onclick='App.makeAvailable("+landId+")' id='availableButton' class='btn btn-warning'>Available for Sale</button>";
              }

              let element = "<div class='col-md-4 assets' style='display:none' id='asset"+landId+"'>"+
              "<div class='card mb-2' style='width: 18rem;'>"+
                "<div class='card-header bg-success text-white'>"+
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

    viewRequest: async function(id){

        $("#approveBtn").on("click", function(){
            App.processRequest(id, 3);
        });
        $("#rejectBtn").on("click", function(){
            App.processRequest(id, 2);
        });
        let LanReg = await App.contracts.LandRegistration.deployed();
        let req = await LanReg.landInfoOwner(id);
        $('#requester').html("Requested by: "+ req[4]);
        $('#requesterModal').fadeIn(200);
        console.log(req);
    },

    processRequest: async function(id, status){
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
          instance.processRequest(id, status, {from:account});
        }).then(function(){
          location.reload();
        });;
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
      web3.eth.getAccounts(function(err, accounts){
        if (err != null){
            console.log("An error occurred: "+err);
            alert("An error occurred: "+err);
        }
        else if (accounts.length == 0){
            alert("User is not logged in to Ethereum Wallet");
        }
        else{
          sessionStorage.setItem("account", "buyer");
          window.location.replace("buyer-home.html");
        }
      });
    },

    searchAsset: async function(){
      let str = $("#searchBox").val();
      let lowerStr = str.toLowerCase();
      let upperStr = str.toUpperCase(); 

      if(str === ""){
        alert("Search box empty.");
      }
      else{
          $.getJSON( "land.json", function(data) {
      
            for(var i =0; i < data.length; i++){

                let completeLoc = data[i].complete_location;
                let village = data[i].village;
                let brgy = data[i].barangay;
                let cityMun = data[i].citymunicipality;
                let prov = data[i].province;

                if(completeLoc.indexOf(str)>=0 ||
                  village.indexOf(str) >=0  ||
                  brgy.indexOf(str) >= 0 ||
                  cityMun.indexOf(str) >=0 ||
                  prov.indexOf(str) >=0 ||
                  completeLoc.indexOf(lowerStr)>=0 ||
                  village.indexOf(lowerStr) >=0  ||
                  brgy.indexOf(lowerStr) >= 0 ||
                  cityMun.indexOf(lowerStr) >=0 ||
                  prov.indexOf(lowerStr) >=0 ||
                  completeLoc.indexOf(upperStr)>=0 ||
                  village.indexOf(upperStr) >=0  ||
                  brgy.indexOf(upperStr) >= 0 ||
                  cityMun.indexOf(upperStr) >=0 ||
                  prov.indexOf(upperStr) >=0 
                ){  
                  
                  let element = "<div class='shadow-lg card mr-3 mt-2 ' id='land"+data[i].id+"' style='width: 18rem;' >"+
                      "<h6 class='card-header bg-primary text-white'>Asset "+data[i].id+"</h6>"+
                      "<div class='card-body'><center>"+
                      "<p class='card-title'>Survey "+data[i].surveyNo+"</p>"+
                      "<a href='#' onclick='App.pullDetails("+data[i].id+")' class='btn btn-link'>View Details</a>"+
                      "</center></div>"+
                      "</div>";

                      App.checkIfForSale(data[i].id);
                      $('#results').append(element);
                }
                else{

                  $('#noResults').fadeIn(200);
                  $('#searchBtn').prop('disabled', true).hide();
                  $('#clearBtn').show();
                }
            }
          });
        }
    },

    checkIfForSale: async function(id){
        let LanReg = await App.contracts.LandRegistration.deployed();
        let res = await LanReg.checkIfForSale(id);
        console.log(res);
        if(res == null){
          $('#noResults').fadeIn(300);
        }
        else{
          if (res == false){
            $("#land"+id).css('display','none');
          }
          else{
            jQuery(document).ready(function() {
              setTimeout(function() {
                  $('#results').fadeIn(300);
                  $('#forSaleHeader').fadeIn(300);
              }, 200);
            });

            $('#searchBtn').prop('disabled', true).hide();
            $('#clearBtn').show();
          }
        }
    },
    
    pullDetails: async function(id){
      $(".2ndlink").addClass('active');
      $(".1stlink").removeClass('active');
      

      let LanReg = await App.contracts.LandRegistration.deployed();
      let res = await LanReg.landInfoBuyer(id);
      let owner = await LanReg.getLandOwner(id);
      let price = await LanReg.getMarketValue(id);
      console.log(res);

      $.getJSON( "land.json", function(data) {
        for(let i=0; i<data.length; i++){
          if(data[i].id == id){
            console.log("survey: " +data[i].surveyNo);
            $('#regDate').html("Registration Date: <b>"+App.convertUnixtoDate(data[i].registration_date)+"</br>")
            $('#surNum').html("Survey Number: <b>"+data[i].surveyNo+"</b>");
            $('#area').html("Area: <b>"+data[i].area+" sqm</b>");
            $('#comLoc').html("Complete Location: <b>"+data[i].complete_location+"</b>");
            $('#brgy').html("Barangay: <b>"+data[i].barangay+"</b>");
            $('#city').html("City/municipality: <b>"+data[i].citymunicipality+"</b>");
            $('#prov').html("Province: <b>"+data[i].province+"</b>");
            $('#own').html("Owner: <b>"+owner+"</b>");
            $('#price').html("Price: <b>"+parseInt(price)+" ETH</b>");
            $('#landDetailsModal').show(200);
            $('#requestPurchase').attr("onclick", "App.requestPurchase("+id+")");

          }
        }
      });

    },

    requestPurchase: function(id){
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
        instance.requestToLandOwner(id,{from:account});
        $('#successReqModal').fadeIn(200);
        $('#requestPurchase').html("Purchase Requested").removeClass("btn-primary").addClass("btn-info");
        location.reload();
      });
    },

    pullRequestedAssets: function(){

    //  $('.2ndlink').attr("disabled", true);

      $.getJSON( "land.json", function(data) {
        for(let i=0; i<data.length; i++){
          let element = "<div class='shadow-lg card mr-3 mt-2 ' id='land"+data[i].id+"' style='width: 18rem;' >"+
          "<h6 class='card-header bg-success text-white'>Land Property "+data[i].id+"</h6>"+
          "<div class='card-body'><center>"+
          "<p class='card-title'>Survey "+data[i].surveyNo+"</p>"+
          "<a href='#' onclick='App.pullDetails("+data[i].id+")' class='btn btn-link'>View Details</a><br>"+
          "<p id='allowP"+data[i].id+"' style='display:none'>The owner had allowed purchase of this asset.</p>"+
          "<button  class='btn btn-success' id='buyBtn"+data[i].id+"' style='display:none'>Buy</button>"+
          "</center></div>"+
          "</div>";

          App.checkIfRequested(data[i].id);
          $('#results').append(element);
        }
      });
    },

    checkIfRequested: async function(id){
        let account;
        web3.eth.getAccounts(function(error, accounts) {
          if (error) {
            console.log(error);
          }
          else{
            account = accounts[0];
          }
        });

        let LanReg = await App.contracts.LandRegistration.deployed();
        let res = await LanReg.landInfoBuyer(id);

        let status = res[4].c[0];
        let currentOwner = res[0];
        console.log(id + " owner: "+currentOwner);
        console.log(id + " requester: "+res[3]);

        if(status == 3){
          $("#buyBtn"+id).show();
          $("#allowP"+id).show();
          
        }
       
        if(res[3] != account){
          $("#land"+id).hide();
          $("#forSaleHeader").html("You requested purchase for the following properties:").fadeIn(500);       
        }
        else if(res[3] == account){
          $("#requestPurchase").hide();
        }

        $("#buyBtn"+id).on('click', function(){
          App.buyAsset(id, currentOwner);
        })

        $("#searchBox").hide();
        $("#searchBtn").hide();
        $('#results').fadeIn(1000);
    },

    buyAsset: async function(id, currentOwner){  
        console.log("Buy "+ id +" from "+currentOwner);

        let account;
        web3.eth.getAccounts(function(error, accounts) {
          if (error) {
            console.log(error);
          }
          else{
            account = accounts[0];
          }
        });
        

        let LanReg = await App.contracts.LandRegistration.deployed();
        let valuePrice = await LanReg.getMarketValue(id);
        //let mValue = parseInt(valuePrice ** 19);
        let mValue  = web3.toWei(valuePrice, "ether");
        let ethValue = web3.fromWei(mValue, "ether");
        
        console.log(id +" price: "+valuePrice +" ETH");
        console.log(valuePrice +" ETH = " + ethValue);
        //console.log("New Value = " + newValue);

      try{
        App.contracts.LandRegistration.deployed().then(function(instance){
          instance.buyProperty(id, {
            from: account,
            value: mValue
          });
        });
      }
      catch(err){
        console.log(err.message);
      }
    }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
