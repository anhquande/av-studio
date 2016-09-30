# av-studio
av-studio is a command-line utility to manipulate audios, videos and images using **ffmpeg** and **imagemagick**

-----------------------
## Features
### Videos and Audios
* Create slideshow from a series of images, optional with watermark
* Create PIP (picture-in-picture) video in which a video is overlayed on top of the other
* Extract MP3 audio from a video
* Mix an audio with a video
* Add an image watermark into a video.
* Add text into a video
* Mute videos 
* Resize videos
* Trim videos
* Join or merge multiples videos into one
* Mix randomly multiple short clips to create a video mashup
* Hard burn a subtitle to a video

### Images
* Resize/Crop a image
* Add Frame to an image. A frame is basically a transparent background image overlayed on top of the other image

-----------------------
## Quick start
* Launch your terminal and go to your workspace directory
* Clone the project repo by running the command git clone

        git clone https://github.com/anhquande/av-studio.git

* Install project dependencies

        npm install

* Make sure that **ffmpeg** and **imagemagick** are both installed and included in the global PATH environment, so that you can execute them at anywhere
* For convenience it is better to add the project directory in the global PATH environment

-----------------------
## How to use
**Assumed that you already added the av-studio directory in the global PATH environment** 
1. Get general help 
        av -h

2. Get help of a certain command
        
        av <command> -h

    Example:
    * get help about how to resize an image
        
            av image-resize -h

    * or just type any parameters after **av** then you will get some __hints__ from the error messages


## Examples
1. Create a **slideshow** from *15* images in the folder *C:\My Documents\My Pictures*, each image appears in 10 seconds

        av slideshow "C:\My Documents\My Pictures" -c 15 -d 10

2. Add logo to video

        av logo mylogo.png myvideo.mp4 -o myvideo_with_logo.mp4

3. Create a Picture-in-Picture video
        
        av pip background.mp4 myvideo.mp4 -o product.mp4

4. Burn subtitle
   
        av subtitle myvideo.mp4 mysutitle.srt 

5. Trim 5 seconds from beginning of a video

        av trim myvideo.mp4 -b 0 -e 00:00:05 -o mytrimvideo.mp4

6. Trim a video from 00:01:00 until the end

        av trim myvideo.mp4 -b 00:01:00 -o mytrimvideo.mp4

7. Resize image

        av imageresize myphoto.jpg -s "1024x768"

8. Join 3 videos into one

        av join open.mp4 main.mp4 end.mp4 -o final.mp4