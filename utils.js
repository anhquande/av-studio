'use strict'
const shell = require('shelljs')
const fs = require('fs')
const pathUtils = require('path')
const sprintf = require('sprintf-js').sprintf
require('string.prototype.startswith');

/**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
exports.shuffleArray = function (array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

exports.isFile = isFile

function isFile(path) {
  try {
    let prop = fs.lstatSync(path)
    return prop.isFile()
  } catch (err) {
    console.log(err)
  }

  return false
}

exports.isDirectory = isDirectory

function isDirectory(path) {
  try {
    let prop = fs.lstatSync(path)
    return prop.isDirectory()
  } catch (err) {
    console.log(err)
  }

  return false
}

exports.findFiles = findFiles
function findFiles(dir, includedExtensions) {
  let dirContents = fs.readdirSync(dir).filter(function(file){
    let ext = pathUtils.extname(file)

    for(let i = 0;i<includedExtensions.length; i++){
      if (ext === includedExtensions[i])
        return true
    }

    return false;
  })
  let files = []

  for (let i = 0; i < dirContents.length; i++) {
    let item = dir + '/' + dirContents[i]

    if (isFile(item)) {
      files.push(dirContents[i]);
    }
  }
  return files;
}

exports.findVideoFiles = function (dir) {
  return findFiles(dir,  ['.mp4','.avi','.mpeg','.webm'])
}

exports.findImageFiles = function (dir) {
  return findFiles(dir,  ['.jpg','.bmp','.png'])
}

exports.getFilenameWithoutExt = getFilenameWithoutExt

function getFilenameWithoutExt(path) {
  let ext = pathUtils.extname(path)
  let filename = pathUtils.basename(path, ext)
  return filename
}


exports.quoteLongFilename = quoteLongFilename

function quoteLongFilename(filename) {
  //if (filename.startsWith('"'))
  //  return filename;

  return '"' + filename + '"'
}

/**
 * Format second (in String) into HH:MM:SS
 */
exports.formatDuration = function (input) {
  let secs = Math.round(parseInt(input, 10))
  let hours = Math.floor(secs / 3600)

  let remainMinutes = secs % 3600
  let minutes = Math.floor(remainMinutes / 60)

  let remainSeconds = remainMinutes % 60
  let seconds = Math.ceil(remainSeconds)

  return sprintf('%02d:%02d:%02d', hours, minutes, seconds)
}

exports.getOutputFile = function (inputParam, sourceFile, extension) {

  let outputFile
  if (isFile(inputParam)) {
    outputFile = inputParam
  } else if (isDirectory(inputParam)) {
    outputFile = inputParam + '/' + getFilenameWithoutExt(sourceFile) + extension
  } else {
    outputFile = "output" + extension
  }

  return outputFile
}

exports.shellExec = function (cmd, verbose, ignoreError) {
  if (typeof verbose === 'undefined') verbose = true
  if (typeof ignoreError === 'undefined') ignoreError = true

  if (verbose) {
    console.log()
    console.log('  executing command:')
    console.log(cmd)
    console.log()
  }


  if (shell.exec(cmd).code !== 0) {
    if (verbose) console.log('Error when executing the following command:' + cmd);
    if (ignoreError) process.exit(1);
  }
}