# Kyrix - mgh app
## Get it running
Start the cloud instance `kyrix-m`. Log into the instance using `gcloud compute ssh kyrix-m`, then do the following:

* Add the public ip of the instance to the postgres instance. Use `curl ifconfig.me` to get public ip. Go to console.cloud.google.com, click SQL on the left panel, then click on the instance `eeg-map`. Under `connections`, click `add network`, add your ip to the `network` box, click `Done` and then `Save`. You need to perform this step every time you starts the `kyrix-m` instance. 
* `cd Kyrix/tile-server`, then `runts`. You should be able to see some Bigtable testing log, followed by "`Tile server started...`"
* Goto `ip:8900` to see the app. `ip` is the public ip of the `kyrix-m` instance. 

## Controls of the GUI
* Double click on the cluster view to zoom in. Shift + double click to zoom out.
* Click on a 2-second segment on the cluster to load its EEG and spectrogram. 
* Mouse drag to pan on the cluster view. 
* Left/Right arrows to pan the EEG, or use mouse drag.
* Up/Down arrows to increase/decrease the gain. 
* Press `M` key to switch montages. 
* Spectrogram is not zoomable right now. It shouldn't be pannable since we want to sync it w/ EEG. 
* Click on a radio box in the upper right corner to make a label for the highlighted 2-sec segment. 

## Development
