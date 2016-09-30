'use strict'
const util = require('util')
const commonUtils = require('./utils.js')
const shell = require('shelljs')
const ffmpeg = require('./ffmpeg-node.js')
const fs = require('fs')
const pathUtils = require('path')
const moment = require('moment')
const string = require('string')
require("moment-duration-format");

const BASE_DIR = string(__dirname).replaceAll('\\', '/').s;
const OPEN_VIDEO = BASE_DIR + '/assets/videos/open.mp4'
const END_VIDEO = BASE_DIR + '/assets/videos/end.mp4'
const FONT_FILE = BASE_DIR + '/assets/fonts/arial.ttf'
const BACKGROUND_VIDEO = BASE_DIR + '/assets/videos/background.mp4'
const LOGO = BASE_DIR + '/assets/imgs/logo.png'

exports.getVideoDuration = getVideoDuration

function getVideoDuration(videoFile) {
  let cmd = 'ffprobe -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 ' + commonUtils.quoteLongFilename(videoFile)

  let duration = shell.exec(cmd, {
    silent: true
  }).stdout
  return duration
}

exports.normalizeFootageDir = function (videoDir, startFrom, maxDuration, newSize, outputDir) {
  var sourceFiles = commonUtils.findVideoFiles(videoDir);
  for (var i = 0; i < sourceFiles.length; i++) {
    let input = videoDir + '/' + sourceFiles[i];
    let output = outputDir + '/norm_' + sourceFiles[i];
    ffmpeg.normalizeFootage(input, startFrom, maxDuration, newSize, output)
  }

  return 0
}

/**
 * normalize a video means:
 * - 1) Cut if the video is longer than the maxDuration
 * - 2) Mute the video
 * - 3) Convert to H.264/MPEG-4
 */
exports.normalizeFootage = function (input, startFrom, maxDuration, newSize, output) {
  if (commonUtils.isDirectory(output)){
    output = output + "/" + commonUtils.getFilenameWithoutExt(input)+"_norm.mp4"
  }
  let d = getVideoDuration(input)

  //cut if the video is too long
  let normalizeDuration = ' -ss 00:00:00'

  if (typeof startFrom !== 'undefined') {
    normalizeDuration = ' -ss ' + startFrom
  }

  if (d > maxDuration) {
    normalizeDuration += util.format(' -to %s ', commonUtils.formatDuration(maxDuration))
  }

  // -an: no audio
  // -filter:v scale=%s : resize video
  // -c:v libx264 convert to H.264/MPEG-4
  let cmd = util.format('ffmpeg -y -i "%s" %s -vf scale=%s,setsar=1:1,setdar=16:9 -crf 22 -c:v libx264 -preset slow -an "%s"', input, normalizeDuration, newSize, output);

  commonUtils.shellExec(cmd);
}

exports.logo = function (inputPath, logo, position, x, y, outputPath) {
  let cmd;

  let outputVideo = outputPath
  let inputVideo = inputPath

  switch (position) {
    case 'tl':
      cmd = util.format('ffmpeg -i "%s" -i "%s" -filter_complex "overlay=%s:%s" -y "%s"', inputVideo, logo, x, y, outputVideo);
      break;

    case 'bl':
      cmd = util.format('ffmpeg -i "%s" -i "%s" -filter_complex "overlay=%s:main_h-overlay_h-%s" -y "%s"', inputVideo, logo, x, y, outputVideo);
      break;

    case 'br':
      cmd = util.format('ffmpeg -i "%s" -i "%s" -filter_complex "overlay=main_w-overlay_w-%s:main_h-overlay_h-%s" -y "%s"', inputVideo, logo, x, y, outputVideo);
      break;
    case 'tr':
    default:
      cmd = util.format('ffmpeg -i "%s" -i "%s" -filter_complex "overlay=main_w-overlay_w-%s:%s" -y "%s"', inputVideo, logo, x, y, outputVideo);
  }
  commonUtils.shellExec(cmd);
}

exports.trimVideo = function (videoFile, beginTime, endTime, outputDir) {
  let cmd;
  let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(videoFile) + '_trim' + pathUtils.extname(videoFile)
  newFile = commonUtils.quoteLongFilename(newFile)
  videoFile = commonUtils.quoteLongFilename(videoFile)

  if (endTime == 'end') {
    cmd = util.format('ffmpeg -y -ss %s -i %s %s', beginTime, videoFile, newFile)
  } else {
    cmd = util.format('ffmpeg -y -ss %s -i %s -to %s %s', beginTime, videoFile, endTime, newFile)
  }

  commonUtils.shellExec(cmd);
}

exports.trimVideoDir = function (videoDir, beginTime, endTime, outputDir) {
  var files = commonUtils.findVideoFiles(videoDir);

  for (var i = 0; i < files.length; i++) {
    let videoFile = commonUtils.quoteLongFilename(videoDir + '/' + files[i])
    let newFile = commonUtils.quoteLongFilename(outputDir + '/' + commonUtils.getFilenameWithoutExt(files[i]) + '_trim' + pathUtils.extname(files[i]))

    let cmd
    if (endTime == 'end') {
      cmd = util.format('ffmpeg -y -i %s -ss %s %s', videoFile, beginTime, newFile)
    } else {
      cmd = util.format('ffmpeg -y -i %s -ss %s -to %s %s', videoFile, beginTime, endTime, newFile)
    }

    commonUtils.shellExec(cmd);
  }
}

exports.mix = function (audio, video, outputVideo) {
  let cmd = util.format('ffmpeg -y -i "%s" -i "%s" -codec copy -shortest "%s"', audio, video, outputVideo);
  commonUtils.shellExec(cmd)
}

exports.joinrandom = function (videoDirectory, duration, mode, logo, slogan, outputVideo) {
  var sourceFiles = commonUtils.findVideoFiles(videoDirectory);
  sourceFiles = commonUtils.shuffleArray(sourceFiles);
  let fileList = []
  let d = 0
  let maxDuration = parseInt(duration)
  for (var i = 0; i < sourceFiles.length; i++) {
    let path = videoDirectory + '/' + sourceFiles[i];
    let fileDuration = getVideoDuration(path)

    d += parseInt(fileDuration)
    fileList.push(path)
    if (d > maxDuration)
      break;
  }

  return ffmpeg.join(fileList, mode, logo, slogan, outputVideo);
}

exports.join = function (videos, mode, logo, slogan, outputVideo) {
  let inputs = '';
  let filters = '';
  let count = 0;

  //TODO: Add logo
  let insertLogo = ''
    //TODO: Add slogan
  let insertSlogan = ''

  switch (mode) {
    case 'v': //merge video only
      videos.forEach(function (v) {
        inputs += ' -i ' + commonUtils.quoteLongFilename(v)

        let tmp = util.format(' [%d:v:0] ', count)
        filters += tmp

        count++;
      });

      //NO LOGO 'ffmpeg -y ' + inputs + ' -filter_complex "' + filters + 'concat=n=' + count + ':v=1 [v] " -map "[v]" '+commonUtils.quoteLongFilename(outputVideo)
      return 'ffmpeg -y ' + inputs + ' -filter_complex "' + filters + 'concat=n=' + count + ':v=1 [v] " -map "[v]" ' + commonUtils.quoteLongFilename(outputVideo)

    case 'a': //join audio only
      videos.forEach(function (v) {
        inputs += ' -i ' + commonUtils.quoteLongFilename(v)

        let tmp = util.format(' [%d:a:0] ', count)
        filters += tmp

        count++;
      });

      return 'ffmpeg -y ' + inputs + ' -filter_complex "' + filters + 'concat=n=' + count + ':a=1 [a] " -map "[a]" ' + commonUtils.quoteLongFilename(outputVideo)

    default: //join audio and video
      videos.forEach(function (v) {
        inputs += ' -i ' + commonUtils.quoteLongFilename(v)

        let tmp = util.format(' [%d:v:0] [%d:a:0] ', count, count)
        filters += tmp

        count++;
      });

      return 'ffmpeg -y ' + inputs + ' -filter_complex "' + filters + 'concat=n=' + count + ':v=1:a=1 [v] [a]" -map "[v]" -map "[a]" ' + commonUtils.quoteLongFilename(outputVideo)
  }
}

exports.slideshow = function (inputDir, logo, title, newSize, slotDuration, imageCount, outputFile) {

  let sourceFiles = commonUtils.findImageFiles(inputDir);
  sourceFiles = commonUtils.shuffleArray(sourceFiles);
  let imageFiles = []
  let loopCount = Math.ceil(imageCount / sourceFiles.length)
  for(let k = 0; k < loopCount; k++){
    for (let i = 0; i < sourceFiles.length && i < imageCount; i++) {
      imageFiles.push(sourceFiles[i])
    }
  }
  let durationInSecond = parseInt(slotDuration, 10)
  let transDuration = 1
  let startTransition = durationInSecond - transDuration
  let inputs = '';
  let filters = ''
  let maps = ''
  let index = 0
  imageFiles.forEach(function (aFile) {
    let inputFile = inputDir + "/" + aFile;
    inputs += util.format(' -loop 1 -t %d -i "%s" ', durationInSecond, inputFile)

    filters += util.format(' [%d:v]fade=t=in:st=0:d=%d,fade=t=out:st=%d:d=%d[v%d]; ',
      index, transDuration, startTransition, transDuration, index)
    maps += util.format('[v%d]', index)
    index++;
  })

  let cmd
  console.log()
  console.log(logo)
  
  if ((logo === 'undefined') || (logo.length==0)){
    let output = util.format('concat=n=%d:v=1:a=0,format=yuv420p[v]" -map "[v]" "%s"', index, outputFile)
    cmd = 'ffmpeg -y ' + inputs + ' -filter_complex "' + filters + ' ' + maps + ' ' + output
  }
  else{
    let output = util.format('concat=n=%d:v=1:a=0,format=yuv420p[v1];[v1][%d:v]overlay=10:10[v]" -map "[v]" "%s"', index, index, outputFile)
    cmd = 'ffmpeg -y ' + inputs + '-i "'+logo+'" -filter_complex "' + filters + ' ' + maps + ' ' + output
  }
  commonUtils.shellExec(cmd);
}


/**
 * 1) Merge published video = opening clip (open.mp4) + videoFile.mp4 + ending clip (end.mp4) 
 * 2) Overlay published video on top of background.mp4
 * 3) Overlay logo (logo.png)
 * 4) Overlay title (videoFile.txt at top left corner)
 */
exports.publishVideo = function (videoFile, outputFileOrDir) {
  if (!commonUtils.isFile(videoFile)) {
    console.log(' Error: Invalid input video file. Input = ' + videoFile)
    process.exit(0)
  }

  let newFile
  if (commonUtils.isDirectory(outputFileOrDir)) {
    newFile = outputFileOrDir + '/' + commonUtils.getFilenameWithoutExt(videoFile) + '_published' + pathUtils.extname(videoFile)
  } else if (commonUtils.isFile(outputFileOrDir)) {
    newFile = outputFileOrDir
  } else {
    console.log(' Error: Invalid output. Output must be a valid file or directory. Output = ' + outputFileOrDir)
    process.exit(0)
  }

  let mainVideo = videoFile
  let backgroundLst = "background.lst"
  let videoBareFilename = commonUtils.getFilenameWithoutExt(videoFile)
  let textFile = videoBareFilename + '.txt'
  let textPosX = '10'
  let textPosY = '10'
  let textColor = 'yellow@0.2'
  let textSize = '32'

  console.log('*** Check file exists ...')
  let requiredFiles = [mainVideo, OPEN_VIDEO, END_VIDEO, BACKGROUND_VIDEO, textFile, FONT_FILE]
  for (var i = 0, len = requiredFiles.length; i < len; i++) {
    let theFile = requiredFiles[i]
    if (!commonUtils.isFile(theFile)) {
      console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... missing. It is required to publish this video')
      console.log()
      process.exit(0)
    }
    console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... ok')
  }

  console.log()
  console.log('*** Check input videos ...')
    //valid videos (including background.mp4, open.mp4,end.mp4) contains audio and video streams
  let checkVideoFiles = [OPEN_VIDEO, END_VIDEO, BACKGROUND_VIDEO, mainVideo]
  for (var i = 0, len = checkVideoFiles.length; i < len; i++) {
    let theFile = checkVideoFiles[i]
    let streams = ffmpeg.getJSONInfo(theFile, '-show_streams -select_streams a').streams
    if ((typeof streams == 'undefined') || (streams.length == 0)) {
      console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... has no audio stream. Error!')
      process.exit(0)
    }
    console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... ok')
  }

  //Create background list
  var fs = require('fs');
  let lst = '';
  for (let i = 0; i < 3000; i++) {
    lst += 'file \'' + BACKGROUND_VIDEO + '\'\n';
  }

  fs.writeFileSync(backgroundLst, lst);

  let inputs = util.format(' -f concat -i "%s" -i "%s" -i "%s" -i "%s"', backgroundLst //index = 0
      , OPEN_VIDEO //index = 1         
      , mainVideo //index = 2
      , END_VIDEO) //index = 3

  let cmd = 'ffmpeg  -y ' + inputs +
    ' -filter_complex "' +
    '[2:v:0] drawtext=shadowx=2:shadowy=2:alpha=0.8:fontfile=\'' + FONT_FILE + '\':textfile=\'' + textFile + '\':x=' + textPosX + ':y=' + textPosY + ': fontcolor=' + textColor + ':fontsize=' + textSize + ' [video1]; ' +
    '[video1]scale=1185:-1 [pip];' //scale down the main video
    +
    '[0:v:0][pip] overlay=x=368:y=218:shortest=1 [mainvideo];' // over the scaled main video on top of background video
    +
    '[1:v:0] [1:a:0] [mainvideo] [2:a:0] [3:v:0] [3:a:0] concat=n=3:v=1:a=1 [v] [a] " ' //concatenate
    +
    ' -map "[v]" -map "[a]" -c:v libx264 -q:v 0 -acodec mp3 -s 1920x1080 ' + commonUtils.quoteLongFilename(newFile)

  commonUtils.shellExec(cmd);
}



/**
 * 1) Merge published video = opening clip (open.mp4) + videoFile.mp4 + ending clip (end.mp4) 
 * 2) Overlay published video on top of background.mp4
 * 3) Overlay logo (logo.png)
 * 4) Overlay title (videoFile.txt at top left corner)
 */
exports.publishVideo2 = function (videoFile, outputFileOrDir) {
  if (!commonUtils.isFile(videoFile)) {
    console.log(' Error: Invalid input video file. Input = ' + videoFile)
    process.exit(0)
  }

  let newFile
  if (commonUtils.isDirectory(outputFileOrDir)) {
    newFile = outputFileOrDir + '/' + commonUtils.getFilenameWithoutExt(videoFile) + '_published' + pathUtils.extname(videoFile)
  } else if (commonUtils.isFile(outputFileOrDir)) {
    newFile = outputFileOrDir
  } else {
    console.log(' Error: Invalid output. Output must be a valid file or directory. Output = ' + outputFileOrDir)
    process.exit(0)
  }

  let mainVideo = videoFile
  let backgroundLst = "background.lst"
  let videoBareFilename = commonUtils.getFilenameWithoutExt(videoFile)
  let textFile = videoBareFilename + '.txt'
  let textPosX = '10'
  let textPosY = '10'
  let textColor = 'yellow@0.2'
  let textSize = '32'

  console.log('*** Check file exists ...')
  let requiredFiles = [mainVideo, OPEN_VIDEO, END_VIDEO, BACKGROUND_VIDEO, textFile, FONT_FILE]
  for (var i = 0, len = requiredFiles.length; i < len; i++) {
    let theFile = requiredFiles[i]
    if (!commonUtils.isFile(theFile)) {
      console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... missing. It is required to publish this video')
      console.log()
      process.exit(0)
    }
    console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... ok')
  }

  console.log()
  console.log('*** Check input videos ...')
    //valid videos (including background.mp4, open.mp4,end.mp4) contains audio and video streams
  let checkVideoFiles = [OPEN_VIDEO, END_VIDEO, BACKGROUND_VIDEO, mainVideo]
  for (var i = 0, len = checkVideoFiles.length; i < len; i++) {
    let theFile = checkVideoFiles[i]
    let streams = ffmpeg.getJSONInfo(theFile, '-show_streams -select_streams a').streams
    if ((typeof streams == 'undefined') || (streams.length == 0)) {
      console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... has no audio stream. Error!')
      process.exit(0)
    }
    console.log('  ' + (i + 1) + ') check: ' + theFile + ' ... ok')
  }

  //Create background list
  var fs = require('fs');
  let lst = '';
  for (let i = 0; i < 3000; i++) {
    lst += 'file \'' + BACKGROUND_VIDEO + '\'\n';
  }

  fs.writeFileSync(backgroundLst, lst);

  let inputs = util.format(' -f concat -i "%s" -i "%s" -i "%s" -i "%s"', backgroundLst //index = 0
      , OPEN_VIDEO //index = 1         
      , mainVideo //index = 2
      , END_VIDEO) //index = 3

  let cmd = 'ffmpeg  -y ' + inputs +
    ' -filter_complex "' +
    '[2:v:0] drawtext=shadowx=2:shadowy=2:alpha=0.8:fontfile=\'' + FONT_FILE + '\':textfile=\'' + textFile + '\':x=' + textPosX + ':y=' + textPosY + ': fontcolor=' + textColor + ':fontsize=' + textSize + ' [video1]; ' +
    '[video1]scale=1185:-1 [pip];' //scale down the main video
    +
    '[0:v:0][pip] overlay=x=368:y=218:shortest=1 [mainvideo];' // over the scaled main video on top of background video
    +
    '[1:v:0] [1:a:0] [mainvideo] [2:a:0] [3:v:0] [3:a:0] concat=n=3:v=1:a=1 [v] [a] " ' //concatenate
    +
    ' -map "[v]" -map "[a]" -c:v libx264 -q:v 0 -acodec mp3 -s 1920x1080 ' + commonUtils.quoteLongFilename(newFile)

  commonUtils.shellExec(cmd);
}

exports.addSilentAudio = function (videoFile, outputFile) {
  let cmd = util.format('ffmpeg -loglevel quiet -f lavfi -i aevalsrc=0 -i "%s" -vcodec copy -acodec aac -map 0:0 -map 1:0 -shortest -strict experimental -y "%s"', videoFile, outputFile)

  commonUtils.shellExec(cmd);
}

exports.removeAudio = function (videoFile, outputFileOrDir) {

  let newFile
  if (commonUtils.isDirectory(outputFileOrDir)) {
    newFile = outputFileOrDir + '/' + commonUtils.getFilenameWithoutExt(videoFile) + '_nosound' + pathUtils.extname(videoFile)
  } else if (commonUtils.isFile(outputFileOrDir)) {
    newFile = outputFileOrDir
  }

  if (typeof newFile !== 'undefined') {
    let cmd = util.format('ffmpeg -loglevel panic -y -i %s -vcodec copy -an %s', commonUtils.quoteLongFilename(videoFile), commonUtils.quoteLongFilename(newFile));

    return commonUtils.shellExec(cmd);

  }

  console.log('Error when removing audio. Invalid output file or directory')
  return 0;

}

exports.removeAudioDir = function (videoDir, outputDir) {

  if (!commonUtils.isDirectory(outputFileOrDir)) {
    console.log(' Error: Invalid output directory. outputDir= ' + outputDir)
    return 0
  }
  var files = commonUtils.findVideoFiles(videoDir);

  for (var i = 0; i < files.length; i++) {
    let videoFile = videoDir + '/' + files[i]
    let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(files[i]) + '_nosound' + pathUtils.extname(files[i])

    let cmd = util.format('ffmpeg -loglevel panic -y -i %s -vcodec copy -an %s', commonUtils.quoteLongFilename(videoFile), commonUtils.quoteLongFilename(newFile));

    commonUtils.shellExec(cmd);
  }

  return 0;
}

exports.resizeVideo = function (videoFile, newSize, newExtension, outputDir) {

  if (typeof newExtension === 'undefined')
    newExtension = pathUtils.extname(videoFile)

  let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(videoFile) + '_' + newSize.replace(':', 'x') + newExtension

  let cmd = util.format('ffmpeg -y -i %s -filter:v scale=%s -c:a copy %s', commonUtils.quoteLongFilename(videoFile), newSize, commonUtils.quoteLongFilename(newFile));

  return commonUtils.shellExec(cmd);
}

exports.resizeVideoDir = function (videoDir, newSize, newExtension, outputDir) {

  var files = commonUtils.findVideoFiles(videoDir);

  for (var i = 0; i < files.length; i++) {
    if (typeof newExtension === 'undefined')
      newExtension = pathUtils.extname(files[i])
    let videoFile = commonUtils.quoteLongFilename(videoDir + '/' + files[i])
    let newFile = commonUtils.quoteLongFilename(outputDir + '/' + commonUtils.getFilenameWithoutExt(files[i]) + '_' + newSize.replace(':', 'x') + newExtension)

    let cmd = util.format('ffmpeg -y -i %s -filter:v scale=%s -c:a copy %s', videoFile, newSize, newFile);

    commonUtils.shellExec(cmd);
  }
  return 0;
}

exports.drawText = function (video, textFile, horizontalAlign, verticalAlign, marginX, marginY, textColor, font, fontSize, beginTime, endTime, outputVideo) {
  let x;
  let y;
  switch (horizontalAlign) {
    case 'left':
      x = marginX;
      break;

    case 'right':
      x = '(w-text_w-' + marginX + ')';
      break;

    case 'center':
    default:
      x = '(w-text_w)/2';
  }

  switch (verticalAlign) {
    case 'top':
      y = marginY;

      break;

    case 'bottom':
      y = '(h-text_h-' + marginY + ')';
      break;

    case 'middle':
    default:
      y = '(h-text_h)/2';
  }

  return util.format('ffmpeg -y -i %s -vf drawtext="shadowx=2:shadowy=2:alpha=0.8:fontfile=\'%s\': textfile=\'%s: x=%s: y=%s\': fontcolor=%s: fontsize=%s" -codec:a copy %s',
    commonUtils.quoteLongFilename(video), font, textFile, x, y, textColor, fontSize, commonUtils.quoteLongFilename(outputVideo));
}

/**
 * Create picture-in-picture
 */
exports.createPIP = function (inputVideo, backgroundVideo, x, y, width, height, outputVideo) {

  var fs = require('fs');
  let lst = '';
  for (let i = 0; i < 36000; i++) {
    lst += 'file \'' + backgroundVideo + '\'\n';
  }
  fs.writeFileSync('bg.tmp', lst);

  let outWidth = '1920'
  let outHeight = '1080'
  let cmd = util.format('ffmpeg -i %s -f concat -i bg.tmp -filter_complex "[0]scale=%s:%s [pip]; [1][pip] overlay=x=\'%s\':y=\'%s\'" -shortest -level 3.1 -ar 44100 -ab 128k -s %sx%s -vcodec h264 -acodec libvo_aacenc -y %s', commonUtils.quoteLongFilename(inputVideo), width, height, x, y, outWidth, outHeight, commonUtils.quoteLongFilename(outputVideo));
  commonUtils.shellExec(cmd);

}

/**
 * Blend two video frames into each other.
 *
 * The blend filter takes two input streams and outputs one stream, 
 * the first input is the "top" layer and second input is "bottom" layer. 
 * Output terminates when shortest input terminates.
 */
exports.blend = function (topVideo, bottomVideo, outputVideo) {

    let cmd = util.format('ffmpeg -y -i "%s" -i "%s" -filter_complex "[1:0] setsar=sar=1,format=rgba [1sared]; [0:0]format=rgba [0rgbd]; [0rgbd][1sared]blend=all_mode=\'addition\':repeatlast=1:all_opacity=1,format=yuva422p10le" -c:v libx264 -preset slow -tune film -crf 19 -c:a aac -strict -2 -ac 2 -b:a 256k -pix_fmt yuv420p "%s"', commonUtils.quoteLongFilename(topVideo), commonUtils.quoteLongFilename(topVideo), commonUtils.quoteLongFilename(outputVideo));

    commonUtils.shellExec(cmd)
  }
  /*
   * Extract audio track from a video to mp3
   */
exports.extractAudio = function (iFile, outputDir) {
  let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(iFile) + '.mp3'
  let cmd = util.format('ffmpeg -i "%s" -vn -acodec mp3 "%s"', iFile, newFile)
  commonUtils.shellExec(cmd)
}

/*
 * Convert an audio file into a video using a static image
 */
exports.audio2video = function (audioFile, imgFile, outputDir) {
  let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(audioFile) + '-cover.mp4'
  let cmd = util.format('ffmpeg -y -loop 1 -i "%s" -i "%s" -c:v libx264 -c:a aac -strict experimental -b:a 192k -shortest "%s"', audioFile, imgFile, newFile)
  commonUtils.shellExec(cmd)
}

/*
 * Burn subtitle into video
 */
exports.addSubtitle = function (videoFile, subtitle, outputDir) {
    let ext = pathUtils.extname(subtitle)

    if (ext === '.ass') {
      let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(videoFile) + '_subtitle.mp4'
      let cmd = util.format('ffmpeg -y -i "%s" -vf subtitles="%s" "%s"', videoFile, subtitle, newFile)
      commonUtils.shellExec(cmd)
    } else if (ext === '.srt') {
      console.log()
      console.log('Not yet implemented')
      process.exit(1)
    } else {
      console.log()
      console.log('Accept only subtitle file in srt or ass format')
      process.exit(1)
    }

  }
  /* End of function */

/*
 * 'Add a dummy audio track (silent) to a video. It is different from the command mute which remove all the audio track from a video'
 */
exports.dummyAudio = function (iFile, outputDir) {
  let newFile = outputDir + '/' + commonUtils.getFilenameWithoutExt(iFile) + '_av.mp4'
  let cmd = util.format('ffmpeg -y -i "%s" -f lavfi -i anullsrc -c:v copy -c:a mp3 -shortest "%s"', iFile, newFile)
  commonUtils.shellExec(cmd)
}

exports.probe = function (iFile) {
  let cmd = util.format('ffprobe "%s"', iFile)
  commonUtils.shellExec(cmd)
}

exports.getJSONInfo = function (iFile, params) {

  let cmd = util.format('ffprobe -v quiet -print_format json %s -show_streams "%s"', params, iFile)
  let info = shell.exec(cmd, {
    silent: true
  }).stdout

  let json = JSON.parse(info);

  return json
}