<!DOCTYPE html>

<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Visual Summary of a Data Set</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="css/dc.css">
    <link rel="stylesheet" type="text/css" href="css/d3.tip.css">
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
$fileType = pathinfo($target_file, PATHINFO_EXTENSION);

if ($debug) {
    echo("files dump: ");
	var_dump($_FILES);
	echo("<br />");
    echo("fileType: " . $fileType . "<br />");
    echo("targetFile: " . $target_file . "<br />");
}


// ========== CHECKS ==========
if (file_exists($target_file)) {
    // echo "Sorry, file already exists.";
    // $uploadOk = 0;
    // we use the file, which was uploaded before
    $uploadOk = 1;
}
// Check file size, max 20MB
if ($_FILES["fileToUpload"]["size"] > 20000000) {
    echo "Sorry, your file is too large.";
    $uploadOk = 0;
}
// Allow certain file formats
if ($fileType != "csv") {
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
        <div class="col-xs-12 col-lg-9 dc-data-count" id="data-count">
            <h2>
                <small>
                    <span class="filter-count"></span> selected out of <span class="total-count"></span> records |
                    <a id="all" href="#">Reset All</a>
                </small>
            </h2>
        </div>
        <div class="col-xs-12 col-lg-3 tableLegend tableLegendHistogram">
            <div class="row">
                <div class="col-xs-12">
                    <h4>Histogram legend:</h4>
                </div>
            </div>
            <div class="row">
                <div class="col-lg-5 col-lg-offset-0 col-md-2 col-md-offset-8 col-xs-3 col-xs-offset-6">
                    <div class="tableLegendQuartile tableLegendInner">
                        <div class="coloredLegend"></div>
                        <span class="legendText">Quartiles</span>
                    </div>
                    <div class="tableLegendOutlierRange tableLegendInner">
                        <div class="coloredLegend"></div>
                        <span class="legendText">Outlier-area</span>
                    </div>
                </div>
                <div class="col-lg-7 col-md-2 col-xs-3">
                    <div class="tableLegendInt tableLegendInner">
                        <div class="coloredLegend"></div>
                        <span class="legendText">Integer-column</span>
                    </div>
                    <div class="tableLegendDouble tableLegendInner">
                        <div class="coloredLegend"></div>
                        <span class="legendText">Double-column</span>
                    </div>
                    <div class="tableLegendString tableLegendInner">
                        <div class="coloredLegend"></div>
                        <span class="legendText">String-column</span>
                    </div>
                    <div class="tableLegendBoolean tableLegendInner">
                        <div class="coloredLegend"></div>
                        <span class="legendText">Boolean-column</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div id="histograms"></div>
    </div>

    <div class="row">
        <h3 class="showCorrelationMatrix"><a href="javascript:showCorrelationMatrix()">Show Correlation Matrix!</a></h3>
        <div class="tableLegend">
            <h4>Table legend:</h4>
            <div class="tableLegendEmpty tableLegendInner">
                <div class="coloredLegend"></div>
                <span class="legendText">empty cell</span>
            </div>
            <div class="tableLegendFaulty tableLegendInner">
                <div class="coloredLegend"></div>
                <span class="legendText">faulty value</span>
            </div>
            <div class="tableLegendOutlier tableLegendInner">
                <div class="coloredLegend"></div>
                <span class="legendText">outlier value</span>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-xs-12" id="dataTableWrapper">
            <table class="table table-bordered table-striped" id="data-table"></table>
        </div>
    </div>
</div>



<script type="text/javascript" src="js/libs/d3.js"></script>
<script type="text/javascript" src="js/libs/d3.tip.js"></script>
<script type="text/javascript" src="js/libs/crossfilter.js"></script>
<script type="text/javascript" src="js/libs/dc.js"></script>
<script type="text/javascript" src="js/libs/jquery-1.12.3.js"></script>
<script type="text/javascript" src="js/libs/jquery.doubleScroll.js"></script>
<script type="text/javascript" src="js/libs/tooltip.js"></script>

<script type="text/javascript" src="js/classes/cellInfoClass.js"></script>
<script type="text/javascript" src="js/classes/columnInfoClass.js"></script>

<script type="text/javascript" src="js/arrayUtils.js"></script>
<script type="text/javascript" src="js/init.js"></script>
<script type="text/javascript" src="js/parseCsvData.js"></script>
<script type="text/javascript" src="js/calculateStatistics.js"></script>
<script type="text/javascript" src="js/createCharts.js"></script>
<script type="text/javascript" src="js/onclickFunctions.js"></script>

</body>
</html>
