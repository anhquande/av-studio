'use strict'

const program = require('commander')
const ffmpeg = require('./ffmpeg-node.js')
const imagemagick = require('./imagemagick-node.js')
const fs = require('fs');
const commonUtils = require('./utils.js')
const pathUtils = require('path');
const moment = require('moment')
const pkginfo = require('pkginfo')(module, 'version', 'author')

/*** Override the default functions ***/
program.Command.prototype.missingArgument = function (name) {
  console.error();
  console.error("  error: missing required argument `%s'", name);
  console.error("  --------------------------------------------");
  this.help()
  this.prompt('name: ', function (name) {
    console.log('hi %s', name);
  });
}
program.Command.prototype.optionMissingArgument = function (option, flag) {
  console.error();
  if (flag) {
    console.error("  error: option `%s' argument missing, got `%s'", option.flags, flag);
  } else {
    console.error("  error: option `%s' argument missing", option.flags);
  }
  console.error();
  this.help()
}
program.Command.prototype.unknownOption = function (flag) {
    console.error();
    console.error("  error: unknown option `%s'", flag);
    console.error();
    this.help()
  }
  /*** !Override the default functions ***/

program
  .version(module.exports.version)

program
  .command('publish <videoFile>')
  .option('-o, --output <path>', 'Specify the path to the output video. Default is current directory', '.')
  .description('publish a video means add logo, title, intro frame, ending frame into this video')
  .action(function (videoFile, options) {

    let beginTime = new Date()

    ffmpeg.publishVideo(videoFile, options.output)

    let endTime = new Date()
    let duration = moment.duration(endTime - beginTime, "ms").format('h:mm:ss');
    console.log('Publish video in ' + duration)

  })

program
  .command('length <videoFile>')
  .description('Get the video duration')
  .action(function (videoFile, options) {

    let d = ffmpeg.getVideoDuration(videoFile) * 1000

    console.log(d)
    console.log(moment.duration(d, "milliseconds").format('hh:mm:ss.SSS'))
  });

program
  .command('joinrandom <video-directory>')
  .description('Join videos in a directory in a random order')
  .option('-m, --join-mode <mode>', 'a:audio only|v:video only|default:audio and video', 'av')
  .option('-d, --duration <second>', 'Duration in second. Default is 60 secs', '60')
  .option('--logo <image>', 'Image will be overlayed on topright corner')
  .option('--title <text>', 'Text will be overlayed on topleft corner')
  .option('-o, --output <path>', 'Specify the path to the output video. Default is ./output.mp4', 'output.mp4')
  .action(function (videoDirectory, options) {

    ffmpeg.joinrandom(videoDirectory, options.duration, options.joinMode, options.logo, options.title, options.output);

  });

program
  .command('normalize <path>')
  .description('Normalize a footage video: resize, trim, mute')
  .alias('footage')
  .option('-f, --start-from <second>', 'Default is 0')
  .option('-d, --duration <second>', 'Default is 10', '10')
  .option('-s, --newSize <size>', 'Default is 1920:1080', '1920:1080')
  .option('-o, --output <path>', 'Specify the path to the output video. Default is .', '.')
  .action(function (path, options) {

    if (commonUtils.isDirectory(path)) {
      ffmpeg.normalizeFootageDir(path, options.startFrom, options.duration, options.newSize, options.output) 
    } else if (commonUtils.isFile(path)) {
      ffmpeg.normalizeFootage(path, options.startFrom, options.duration, options.newSize, options.output)
    } else {
      console.log('  error: ' + path + ' is not a valid path. The path must be a file or directory')
      process.exit(1)
    }
  });

program
  .command('logo <video> <logo>')
  .description('Add logo into video')
  .alias('watermark')
  .option('-x, --x <pixel>', 'Default is 10', parseInt, '10')
  .option('-y, --y <pixel>', 'Default is 10', parseInt, '10')
  .option('-p, --position <tl|tr|bl|br>', 'Specify the logo position. Default is tr (top right of the screen)', /^(tl|tr|bl|br)$/i, 'tr')
  .option('-o, --output <path>', 'Path to the output video. Default is output.mp4', 'output.mp4')
  .action(function (video, logo, options) {

    ffmpeg.logo(video, logo, options.position, options.x, options.y, options.output);

  });

program
  .command('trim <path> ')
  .description('Trim a video from time1 to time2')
  .alias('cut')
  .option('-b, --begin-time <time>', 'Time format HH:MM:SS')
  .option('-e, --end-time <time>', 'Default is end of video', 'end')
  .option('-o, --output <path>', 'Specify the path to the output video. Default is current directory', '.')
  .action(function (path, options) {
    if (typeof options.beginTime == 'undefined') {
      console.log();
      console.log('  error:   require parameter --begin-time');
      this.help()
      process.exit(1)
    }

    if (commonUtils.isDirectory(path)) {
      ffmpeg.trimVideoDir(path, options.beginTime, options.endTime, options.output)
    } else if (commonUtils.isFile(path)) {
      ffmpeg.trimVideo(path, options.beginTime, options.endTime, options.output)
    } else {
      console.log('  error: ' + path + ' is not a valid path. The path must be a file or directory')
      process.exit(1)
    }

  });

program
  .command('mix <audio> <video>')
  .description('Mix audio and video')
  .option('-o, --output-video <path>', 'Specify the path to the output video. Default is ./output.mp4', 'output.mp4')
  .action(function (audio, video, options) {
    ffmpeg.mix(audio, video, options.outputVideo)
  });

program
  .command('addsub <video> <subtitle>')
  .alias('subtitle')
  .description('Add (burn) subtitle (srt or ass) into the video. It does not embed subtitle as a stream in video, but overlay directly on top of the video.')
  .option('-o, --outputDir <path>', 'Path of the output video. Default is the current directory', '.')
  .action(function (video, subtitle, options) {
    ffmpeg.addSubtitle(video, subtitle, options.outputDir)
  });

program
  .command('dummyaudio <video>')
  .alias('da')
  .description('Add a dummy audio track (silent) to a video. It is different from the command mute which remove all the audio track from a video')
  .option('-o, --outputDir <path>', 'Specify the path to the output. Default is the current directory', '.')
  .action(function (video, options) {
    ffmpeg.dummyAudio(video, options.outputDir);
  });

program
  .command('info <video>')
  .alias('probe')
  .description('Get information about the video')
  .action(function (video, options) {
    ffmpeg.probe(video, options.outputDir);
  });

program
  .command('extract-audio <video>')
  .description('Extract audio track from a video')
  .option('-o, --outputDir <path>', 'Specify the path to the output. Default is the current directory', '.')
  .action(function (video, options) {
    ffmpeg.extractAudio(video, options.outputDir);
  });

program
  .command('audio2video <audioFile> <imgFile>')
  .description('Convert an audio file into a video using a static image')
  .option('-o, --output <path>', 'Path to the output video. Default is the current directory', '.')
  .action(function (audioFile, imgFile, options) {
    ffmpeg.audio2video(audioFile, imgFile, options.output);

  });

program
  .command('join <video1> <video2> [videos...]')
  .description('Join multiples videos into one')
  .option('-s, --slogan <fileText>', 'Path to slogan.txt', 'slogan.txt')
  .option('-l, --logo <fileImage>', 'Path to logo', 'logo.png')
  .option('-m, --join-mode <mode>', 'a:audio only|v:video only|default:audio and video', 'av')
  .option('-o, --output-video <path>', 'Specify the path to the output video. Default is ./output.mp4', 'output.mp4')
  .action(function (video1, video2, videos, options) {
    videos.unshift(video1, video2);
    ffmpeg.join(videos, options.joinMode, options.logo, options.slogan, options.outputVideo);
  });

program
  .command('mute <path>')
  .alias('silent')
  .description('Remove audio track from a video')
  .option('-o, --output <path>', 'Specify the path to the output video. Default is current directory', '.')
  .action(function (path, options) {

    if (commonUtils.isDirectory(path)) {
      ffmpeg.removeAudioDir(path, options.output)
    } else if (commonUtils.isFile(path)) {
      ffmpeg.removeAudio(path, options.output)
    } else {
      console.log('  error: ' + path + ' is not a valid path. The path must be a file or directory')
      process.exit(1)
    }

  });

program
  .command('resize <path>')
  .description('Resize a video')
  .option('-s, --new-size <new_size>', 'E.g. 1920:1080')
  .option('-e, --new-extension <new_size>', 'Extension of the output video including the dot. E.g. .mp4')
  .option('-o, --output <path>', 'Specify the path to the output video. Default is current directory', '.')
  .action(function (path, options) {

    if (typeof options.newSize == 'undefined') {
      console.log()
      console.log('  error:  missing parameter --new-size')
      this.help();
      process.exit(1);
    }

    if (commonUtils.isDirectory(path)) {
      ffmpeg.resizeVideoDir(path, options.newSize, options.newExtension, options.output)
    } else if (commonUtils.isFile(path)) {
      ffmpeg.resizeVideo(path, options.newSize, options.newExtension, options.output)
    } else {
      console.log('  error: ' + path + ' is not a valid path. The path must be a file or directory')
      process.exit(1)
    }

  });

program
  .command('slideshow <imagePath>')
  .description('Create a video slideshow from images')
  .option('-s, --new-size <new_size>', 'Dimension of the output video. Default is 1920:1080', '1920:1080')
  .option('-l, --logo <logoFile>', 'Add logo to video at top-right corner')
  .option('-t, --title <string>', 'Add title to video at top-left corner')
  .option('-d, --slot-duration <seconds>', 'Duration of each image. Default is 6 seconds', '6')
  .option('-c, --image-count <num>', 'Number of images in the output video. Default is 10', '10')
  .option('-o, --output-video <path>', 'Specify the path to the output video. Default is slideshow-<time>.mp4 in the current directory')
  .action(function (imagePath, options) {

    if (typeof options.outputVideo == 'undefined') {
      options.outputVideo = 'slideshow__' + moment().format('YYYY-MM-DD__hh-mm-ss') + '.mp4'
    }

    if (commonUtils.isDirectory(imagePath)) {
      ffmpeg.slideshow(imagePath, options.logo, options.title,options.newSize, options.slotDuration, options.imageCount, options.outputVideo)
    } else {
      console.log('  error: Create slideshow failed. ' + imagePath + ' is not a valid path. The path must be a directory')
      process.exit(1)
    }

  });

program
  .command('text <video> <text-file>')
  .description('Overlay a text on top a video')
  .option('--horizontal-align [left|right|center]', 'Default is center', /^(left|right|center)$/i, 'center')
  .option('--vertical-align [top|middle|bottom]', 'Default is middle', /^(top|middle|bottom)$/i, 'middle')
  .option('-x, --x <pixel>', 'margin X', parseInt, '10')
  .option('-y, --y <pixel>', 'margin Y', parseInt, '10')
  .option('-c, --text-color [color]', 'Default is white', 'white')
  .option('-f, --font [font]', 'Default is arial', 'arial.ttf')
  .option('-s, --font-size [size]', 'Default is 24', parseInt, '24')
  .option('-b, --begin-time [time]', 'Starting time. Default is from beginning of the video (00:00:00)', '00:00:00')
  .option('-e, --end-time [time]', 'Ending time. Default is at the end of the video', 'end')
  .option('-o, --output-video <path>', 'Specify the path to the output video. Default is ./output.mp4', 'output.mp4')
  .action(function (video, textFile, options) {

    ffmpeg.drawText(video, textFile, options.horizontalAlign, options.verticalAlign, options.x, options.y, options.textColor, options.font, options.fontSize, options.beginTime, options.endTime, options.outputVideo);

  });

program
  .command('pip <inputVideo> <backgroundVideo>')
  .description('Create a picture-in-picture video')
  .option('-x, --x <pixel>', 'Default is 10', parseInt, '368')
  .option('-y, --y <pixel>', 'Default is 10', parseInt, '218')
  .option('--width <pixel>', 'Default is original width', '1185')
  .option('--height <pixel>', 'Default is original height', '-1')
  .option('-o, --output-video <path>', 'Specify the path to the output video. Default is ./output.mp4', 'output.mp4')
  .action(function (inputVideo, backgroundVideo, options) {

    ffmpeg.createPIP(inputVideo, backgroundVideo, options.x, options.y, options.width, options.height, options.outputVideo);

  });
program
  .command('blend <topVideo> <bottomVideo>')
  .description('Blend the top video over the bottom video')
  .option('-o, --output-video <path>', 'Specify the path to the output video. Default is ./output.mp4', 'output.mp4')
  .action(function (topVideo, bottomVideo, options) {
    ffmpeg.blend(topVideo, bottomVideo, options.outputVideo);
  });

/// ImageMagick 
program
  .command('image-resize <path>')
  .description('Resize image using imagemagick')
  .option('-s, --new-size <new_size>', 'E.g. 1920x1080', '1920x1080')
  .option('-m, --mode [mode]', '1 = crop, 2 = pad, 3 = fill', '2')
  .option('-o, --output <path>', 'Specify the path to the output video. Default is current directory', '.')
  .action(function (path, options) {

    if (commonUtils.isDirectory(path)) {
      imagemagick.resizeImageDir(path, options.newSize, options.mode, options.output)
    } else if (commonUtils.isFile(path)) {
      imagemagick.resizeImage(path, options.newSize, options.mode, options.output)
    } else {
      console.log('  error: ' + path + ' is not a valid path. The path must be a file or directory')
      process.exit(1)
    }
  });

program
  .command('image-frame <path>')
  .description('Add frame to an image using imagemagick')
  .option('-b, --border-width <pixel>', 'Border width. Default is 5', '5')
  .option('-c, --border-color <c>', 'Border color. Default is black', 'black')
  .option('-o, --border-radius <pixel>', 'Border radius. Default is 2', '2')
  .option('-o, --output-dir <path>', 'Output directory. Default is current directory', '.')
  .action(function (path, options) {

    if (commonUtils.isDirectory(path)) {
      imagemagick.addFrameImageDir(path, options.borderWidth, options.borderColor, options.borderRadius, options.outputDir)
    } else if (commonUtils.isFile(path)) {
      imagemagick.addFrameImage(path, options.borderWidth, options.borderColor, options.borderRadius, options.outputDir)
    } else {
      console.log('  error: ' + path + ' is not a valid path. The path must be a file or directory')
      process.exit(1)
    }

    console.log('Finished!')
  });

program
  .command('image-crop <path>')
  .description('Crop an image by a rectangle specified by position x,y and dimension widthxheight')
  .option('-x, --x <pixel>', 'Default = 0', '0')
  .option('-y, --y <pixel>', 'Default = 0', '0')
  .option('-w, --width <pixel>', '[required]')
  .option('-h, --height <pixel>', '[required]')
  .option('-o, --output-dir <path>', 'Output directory. Default is current directory', '.')
  .action(function (path, options) {

    if (typeof options.width == 'undefined') {
      console.log('--width parameter is missing')
      process.exit(1)
    }
    if (typeof options.height == 'undefined') {
      console.log('--height parameter is missing')
      process.exit(1)
    }

    if (commonUtils.isDirectory(path)) {
      imagemagick.cropImageDir(path, options.x, options.y, options.width, options.height, options.outputDir)
    } else if (commonUtils.isFile(path)) {
      imagemagick.cropImage(path, options.x, options.y, options.width, options.height, options.outputDir)
    } else {
      console.log('  error: ' + path + ' is not a valid path. The path must be a file or directory')
      process.exit(1)
    }

    console.log('Finished!')
  });

program.parse(process.argv);

if (!program.args.length) program.help();