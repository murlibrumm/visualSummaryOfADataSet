<!DOCTYPE html>
<!--suppress ALL -->
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Visual Summary of a Data Set</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="css/dc.css">
    <link rel="stylesheet" type="text/css" href="css/bootstrap.css">
    <link rel="stylesheet" type="text/css" href="css/main.css">
</head>
<body>



<?php
// code from http://www.w3schools.com/php/php_file_upload.asp
$debug = false;
$target_dir = "uploads/";
$target_file = $target_dir . basename($_FILES["fileToUpload"]["name"]);
$uploadOk = 2;
$imageFileType = pathinfo($target_file, PATHINFO_EXTENSION);

if ($debug) {
    echo("files dump: " . var_dump($_FILES) . "<br />");
    echo("imgFileType: " . $imageFileType . "<br />");
    echo("targetFile: " . $target_file . "<br />");
}


// ========== CHECKS ==========
if (file_exists($target_file)) {
    // echo "Sorry, file already exists.";
    $uploadOk = 1;
}
// Check file size, max 500KB
if ($_FILES["fileToUpload"]["size"] > 500000) {
    echo "Sorry, your file is too large.";
    $uploadOk = 0;
}
// Allow certain file formats
if ($imageFileType != "csv") {
    echo "Sorry, only csv-files are allowed.";
    $uploadOk = 0;
}


// ========== UPLOAD ==========
// Check if $uploadOk is set to 0 by an error
if ($uploadOk == 0) {
    echo "Sorry, your file was not uploaded.";
// if everything is ok, try to upload file
} else {
    if ($uploadOk == 1 || move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $target_file)) {
        if ($debug) {
            echo "The file " . basename($_FILES["fileToUpload"]["name"]) .
                (($uploadOk == 1) ? " already existed; using the existing one." : " has been uploaded.");
        }
        echo "<input type='hidden' id='csvTargetFile'         value='" . $target_file . "' />";
        echo "<input type='hidden' id='csvSeparator'          value='" . $_POST['csvSeparator'] . "' />";
        echo "<input type='hidden' id='csvDecimalMark'        value='" . $_POST['decimalMark'] . "' />";
        echo "<input type='hidden' id='csvThousandsSeparator' value='" . $_POST['thousandsSeparator'] . "' />";
    } else {
        echo "Sorry, there was an error uploading your file.";
    }
}
?>

<div id="columnStatistics" class="panel"></div>

<div id="correlationDiv" class="panel">
    <div class='closeInformationDiv'>[<a href='javascript:closeCorrelationMatrix()'> x </a>]</div>
    <table id="correlationTable"></table>
</div>

<div class="container-fluid">
    <div class="row">
        <div class="col-xs-12 dc-data-count" id="data-count">
            <h2>
                <small>
                    <span class="filter-count"></span> selected out of <span class="total-count"></span> records |
                    <a id="all" href="#">Reset All</a>
                </small>
            </h2>
        </div>
    </div>

    <div class="row">
        <h3><a href="javascript:showCorrelationMatrix()">Show Correlation Matrix!</a></h3>
    </div>

    <div class="row">
        <div id="histograms"></div>
    </div>

    <div class="row">
        <div class="col-xs-12" id="dataTableWrapper">
            <table class="table table-bordered table-striped" id="data-table"></table>
        </div>
    </div>
</div>



<script type="text/javascript" src="js/d3.js"></script>
<script type="text/javascript" src="js/crossfilter.js"></script>
<script type="text/javascript" src="js/dc.js"></script>
<script type="text/javascript" src="js/underscore-min.js"></script>
<script type="text/javascript" src="js/jquery-1.12.3.js"></script>
<script type="text/javascript" src="js/jquery.doubleScroll.js"></script>
<script type="text/javascript" src="js/visualSummaryClasses.js"></script>
<script type="text/javascript" src="js/visualSummaryLogic.js"></script>
</body>
</html>
