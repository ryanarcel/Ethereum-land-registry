<?php
    $updatedData = $_POST['newData'];
    file_put_contents('D:/Users/Ryan Arcel Galendez/Desktop/GitHub/Ethereum-land-registry/src/land.json', $updatedData);
    header("location: http://127.0.0.1:3000/inspector-home.html");
?>  