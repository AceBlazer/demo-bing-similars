
//--- upload file
var golbalImg;
var golbalFile;
var globalUrl;
var globalWebsiteToSearchInside = "https://www.johnlewis.com/";

var // where files are dropped + file selector is opened
    dropRegion = document.getElementById("drop-region"),
    // where images are previewed
    imagePreviewRegion = document.getElementById("image-preview");


// open file selector when clicked on the drop region
var fakeInput = document.createElement("input");
fakeInput.type = "file";
fakeInput.accept = "image/*";
fakeInput.multiple = false;
dropRegion.addEventListener('click', function () {
    fakeInput.click();
});

fakeInput.addEventListener("change", function () {
    var files = fakeInput.files;
    golbalFile = files[0];
    handleFiles(files);
});


function preventDefault(e) {
    e.preventDefault();
    e.stopPropagation();
}

dropRegion.addEventListener('dragenter', preventDefault, false)
dropRegion.addEventListener('dragleave', preventDefault, false)
dropRegion.addEventListener('dragover', preventDefault, false)
dropRegion.addEventListener('drop', preventDefault, false)


function handleDrop(e) {
    var dt = e.dataTransfer,
        files = dt.files;
    golbalFile = files[0];
    if (files.length) {

        handleFiles(files);

    } else {

        // check for img
        var html = dt.getData('text/html'),
            match = html && /\bsrc="?([^"\s]+)"?\s*/.exec(html),
            url = match && match[1];



        if (url) {
            uploadImageFromURL(url);
            return;
        }


    }


    function uploadImageFromURL(url) {
        var img = new Image;
        var c = document.createElement("canvas");
        var ctx = c.getContext("2d");

        img.onload = function () {
            c.width = this.naturalWidth;     // update canvas size to match image
            c.height = this.naturalHeight;
            ctx.drawImage(this, 0, 0);       // draw in image
            c.toBlob(function (blob) {        // get content as PNG blob

                // call our main function
                handleFiles([blob]);

            }, "image/png");
        };
        img.onerror = function () {
            alert("Error in uploading");
        }
        img.crossOrigin = "";              // if from different origin
        img.src = url;
    }

}

dropRegion.addEventListener('drop', handleDrop, false);



function handleFiles(files) {

    if (validateImage(files[files.length - 1]))
        previewAnduploadImage(files[files.length - 1]);

}

function validateImage(image) {
    // check the type
    var validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (validTypes.indexOf(image.type) === -1) {
        alert("Invalid File Type");
        return false;
    }

    // check the size
    var maxSizeInBytes = 10e6; // 10MB
    if (image.size > maxSizeInBytes) {
        alert("File too large");
        return false;
    }

    return true;

}

function previewAnduploadImage(image) {

    // container
    var imgView = document.createElement("div");
    imgView.className = "image-view";
    imagePreviewRegion.appendChild(imgView);

    // previewing image
    var img = document.createElement("img");
    imgView.appendChild(img);

    // progress overlay
    var overlay = document.createElement("div");
    overlay.className = "overlay";
    imgView.appendChild(overlay);


    // read the image...
    var reader = new FileReader();
    reader.onload = function (e) {
        img.src = e.target.result;
        golbalImg = e.target.result;
    }
    reader.readAsDataURL(image);




    $('#uploadModal').modal('hide');
    $('#selectionModal').modal('show');

    //convert b64 to blob
    const b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, { type: contentType });
        return blob;
    }



    function drawCanvas() {
        //draw the image
        var c = document.getElementById("myCanvas");
        var ctx = c.getContext("2d");
        var goofyPic = document.getElementById("preview");
        ctx.drawImage(goofyPic, 0, 0, 380, 400);
    }



    //TODO: move it to another file
    $('#selectionModal').on('shown.bs.modal', function () {

        setTimeout(function () {
            const blob = b64toBlob(golbalImg.split(',')[1], golbalImg.split(',')[0].split(':')[1].split(';')[0]);
            console.log(blob)

            if (blob) {
                //upload image to azure and get it's URI
                uploadFiles(golbalFile).then(res => {
                    console.log(res);
                    globalUrl = res
                });

                var settings = {
                    "url": "https://westeurope.api.cognitive.microsoft.com/customvision/v3.0/Prediction/15ee8649-5406-4406-b06a-e54519e60440/detect/iterations/Iteration16/image",
                    "method": "POST",
                    "timeout": 0,
                    "headers": {
                        "Prediction-Key": "***************",
                        "Content-Type": "application/octet-stream"
                    },
                    "data": blob,
                    "processData": false
                };

                $.ajax(settings).done(function (response) {
                    //clear objects list
                    document.getElementById("objectsContainer").innerHTML = '';
                    //clear similars list
                    document.getElementById("rowsContainer").innerHTML = '';
                    document.getElementById("preview").setAttribute("src", golbalImg);
                    drawCanvas();
                    response.predictions.forEach(v => {
                        if (parseFloat(v.probability) >= 0.04) {
                            var objHtml = document.createElement("li");
                            objHtml.setAttribute("style", "cursor: pointer");
                            objHtml.setAttribute("class", "list-group-item");
                            objHtml.addEventListener('click', function drawOnImage() {
                                //TODO: set it's class to active
                                var c = document.getElementById("myCanvas");
                                var ctx = c.getContext("2d");
                                //init
                                if (ctx.rect) {
                                    drawCanvas();
                                }
                                //draw the rectangle
                                ctx.beginPath();
                                ctx.lineWidth = "5";
                                ctx.strokeStyle = "blue";
                                ctx.rect(v.boundingBox.left * 380, v.boundingBox.top * 400, v.boundingBox.width * 380, v.boundingBox.height * 400);
                                ctx.stroke();

                                console.log(parseFloat(v.boundingBox.top), parseFloat(v.boundingBox.top + v.boundingBox.height), parseFloat(v.boundingBox.left), parseFloat(v.boundingBox.left + v.boundingBox.width));

                                //TODO: search for similars 
                                var settings = {
                                    "url": "https://bingvisualsearchfoqus.cognitiveservices.azure.com/bing/v7.0/images/visualsearch/?mkt=en-GB&safeSearch=Moderate",
                                    "method": "POST",
                                    "timeout": 0,
                                    "headers": {
                                        "Content-Type": "multipart/form-data",
                                        "Ocp-Apim-Subscription-Key": "********************"
                                    },
                                    "data": "--boundary_1234-abcd\r\nContent-Disposition: form-data; name=\"knowledgeRequest\"\r\n\r\n{\r\n    \"imageInfo\" : {\"url\" : \"" + globalUrl + "\",\"cropArea\": {\r\n\"top\": " + parseFloat(v.boundingBox.top) + ",\r\n\"bottom\": " + parseFloat(v.boundingBox.top + v.boundingBox.height) + ",\r\n\"left\": " + parseFloat(v.boundingBox.left) + ",\r\n\"right\": " + parseFloat(v.boundingBox.left + v.boundingBox.width) + "\r\n}},\r\n\"knowledgeRequest\" : {\"filters\" : {\"site\" : \""+globalWebsiteToSearchInside+"\"}}\r\n}\r\n\r\n--boundary_1234-abcd--",
                                };

                                $.ajax(settings).done(function (response) {
                                    console.log(response)
                                    //clear html rows container
                                    var counter = 0;
                                    var rowsContainer = document.getElementById("rowsContainer");
                                    //create a row
                                    var row = document.createElement("div");
                                    row.setAttribute("class", "row");
                                    rowsContainer.innerHTML = '';
                                    response.tags.forEach(tag => {
                                        if (tag.actions) {
                                            tag.actions.forEach(action => {
                                                if (action["actionType"] == "VisualSearch" && action.data && action.data.value) {
                                                    action.data.value.forEach(val => {
                                                        var contentUrl = val["contentUrl"];
                                                        var hostPageUrl = val["hostPageUrl"];

                                                        //create column 
                                                        var similarCol = document.createElement("div");
                                                        similarCol.setAttribute("class", "col-md-2");
                                                        //create <a>
                                                        var similarAnchor = document.createElement("a");
                                                        similarAnchor.setAttribute("target", "_blank");
                                                        similarAnchor.setAttribute("href", hostPageUrl);
                                                        //create <img> and nest it on <a>
                                                        var similarImg = document.createElement("img");
                                                        similarImg.setAttribute("class", "img-thumbnail");
                                                        similarImg.setAttribute("style", "width: 150px");
                                                        similarImg.setAttribute("src", contentUrl);
                                                        similarAnchor.appendChild(similarImg);
                                                        //nest <a> to column
                                                        similarCol.appendChild(similarAnchor);
                                                        //append col to row if it has less than 5
                                                        
                                                            row.appendChild(similarCol);
                                                       
                                                        
                                                       rowsContainer.appendChild(row);

                                                    });
                                                }
                                            });
                                        }
                                    });
                                });



                            }, false);
                            objHtml.appendChild(document.createTextNode(v.tagName + " : " + parseFloat(v.probability * 100).toFixed(2).toString() + "%"));
                            document.getElementById("objectsContainer").appendChild(objHtml);
                        }
                    });

                    console.log(response);
                });
            }
        }, 500);

    });
}