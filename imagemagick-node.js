'use strict'
const util = require('util')
const commonUtils = require('./utils.js')
const pathUtils = require('path');
const imagemagick = require('./imagemagick-node.js')
const shell = require('shelljs')

exports.resizeImageDir = function(inputDir, newSize, mode, outputDir){
  var files = commonUtils.findImageFiles(inputDir);

  for (var i=0; i<files.length; i++) {
      let inputFile = inputDir + '/' + files[i]
      let newFile = outputDir+'/'+ commonUtils.getFilenameWithoutExt(files[i])+'_'+newSize+pathUtils.extname(files[i])
      
      let cmd = imagemagick.resizeImage(inputFile, newSize, mode, newFile)

      console.log()
      console.log('Execute cmd: '+cmd)
      shell.exec(cmd)
  }
  return 0;
}

exports.resizeImage = function (inputImage, newSize, mode, outputImage){
  let cmd;
  mode = parseInt(mode);
  console.log(mode);
  switch(mode) {
    case 1: //fill area
      cmd = util.format('convert "%s" -resize %s^ -quality 100 "%s" ', inputImage, newSize, outputImage);
      break;
      
    case 2:
      cmd = util.format('convert "%s" -resize %s! -quality 100 "%s" ', inputImage, newSize, outputImage);
      break;
      
    case 3: //ignore aspect ratio with !
      cmd = util.format('convert "%s" -resize %s! -quality 100 "%s" ', inputImage, newSize, outputImage);
      break;
    
    case 4: //Only Shrink Larger Images ('>' flag)´
      cmd = util.format('convert "%s" -resize "%s>" -quality 100 "%s" ', inputImage, newSize, outputImage);
      break;
      
    case 5: //Only Enlarge Smaller Images ('<' flag)
      cmd = util.format('convert "%s" -resize "%s<" -quality 100 "%s" ', inputImage, newSize, outputImage);
      break;
      
    default:
          cmd = util.format('convert "%s" -resize "%s>" -quality 100 "%s" ', inputImage, newSize, outputImage);
  }
  
  console.log(cmd)
  return cmd;
}

exports.addFrameImageDir = function (inputDir, borderWidth, borderColor, borderRadius, outputDir) {
   var files = commonUtils.findImageFiles(inputDir);

  for (var i=0; i<files.length; i++) {
      let inputFile = commonUtils.quoteLongFilename(inputDir + '/' + files[i])
      
      let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(inputFile)+'-framed.jpg'
      newFile = commonUtils.quoteLongFilename(newFile)

      let cmd = util.format('convert %s  -bordercolor %s -compose Copy  -border %s -format "roundrectangle 1,1 %[fx:w+4],%[fx:h+4] %s,%s" %s',inputFile, borderColor, borderWidth,  borderRadius, borderRadius, newFile)
  
      console.log()
      console.log('Execute cmd: '+cmd)
      shell.exec(cmd)
  }
  return 0;
}

exports.addFrameImage = function (inputFile, borderWidth, borderColor, borderRadius, outputDir) {  
  let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(inputFile)+'-framed.jpg'
  let cmd = util.format('convert %s  -bordercolor %s -compose Copy  -border %s -format "roundrectangle 1,1 %[fx:w+4],%[fx:h+4] %s,%s" %s',inputFile, borderColor, borderWidth,  borderRadius, borderRadius, newFile)
  
  console.log()
  console.log('Execute cmd: '+cmd)
  
  return shell.exec(cmd).code
}

exports.cropImage = function (inputFile, x, y, width, height, outputDir) {
  let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(inputFile)+'-framed.jpg'
  let cmd = util.format('convert %s  -crop %sx%s+%s+%s %s',commonUtils.quoteLongFilename(inputFile), width, height,  x, y, commonUtils.quoteLongFilename(newFile))
  
  console.log()
  console.log('Execute cmd: '+cmd)
  
  return shell.exec(cmd).code

}

exports.cropImageDir = function (inputDir, x, y, width, height, outputDir) {
   var files = commonUtils.findImageFiles(inputDir);

  for (var i=0; i<files.length; i++) {
      let inputFile = commonUtils.quoteLongFilename(inputDir + '/' + files[i])
      
      let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(inputFile)+'-crop-'+width+'x'+height+'.jpg'
      newFile = commonUtils.quoteLongFilename(newFile)
      let cmd = util.format('convert %s  -crop %sx%s+%s+%s %s',inputFile, width, height,  x, y, newFile)
  
      console.log()
      console.log('Execute cmd: '+cmd)
      shell.exec(cmd)
  }
  return 0;
}
