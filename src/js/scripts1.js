$(document).ready(function(){
    if (sessionStorage.getItem("account") == null){
      window.location.replace("index.html");
    }
    else if(sessionStorage.getItem("account") == "owner"){
      window.location.replace("owner-home.html");
    }
    console.log(sessionStorage.getItem("account"));

    $(".logout").click(function(){
        alert("You are logging out.");
        sessionStorage.clear();
        indow.location.replace("index.html");
    });

    $('.next').click(function(){

      let surveyNo = $("#surveyNo").val();
      let area = $("#area").val();
      // let lotNo = $("#lotNo").val();
      // let blockNo = $("#blockNo").val();
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

      let location = completeLoc +", "+ village +", Brgy. " +brgy +", "+cityMun + ", "+province;

      if( surveyNo == "" || area == "" || completeLoc == "" || village == "" || brgy == "" ||
        cityMun == "" || owner == "" || ownerName =="" || marketVal == "" || dateOfReg == ""){
          alert("Please fill up every field.");
      }
      else{
        $('#date').html("<b>"+dateOfReg+"</b>");
        $('#displaySurveyNo').html("<b>"+surveyNo+"</b>");
        $('#displayArea').html("<b>"+area+"</b>");
        $('#displayLocation').html("<b>"+location+"</b>");
        $('#displayOwner').html("<b>"+ownerName +"<br>("+owner+")</b>");
        $('#displayPrice').html("<b>"+marketVal +" ETH</b>");

        $('.modal').fadeIn(300);
      }
    })

    //$('#table').DataTable();

  })