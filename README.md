# Kyrix - mgh app
## Get it running
Start the cloud instance `kyrix-m`. Log into the instance using `gcloud compute ssh kyrix-m`, then do the following:

* Add the public ip of the instance to the postgres instance. Use `curl ifconfig.me` to get public ip. Go to console.cloud.google.com, click SQL on the left panel, then click on the instance `eeg-map`. Under `connections`, click `add network`, add your ip to the `network` box, click `Done` and then `Save`. You need to perform this step every time you starts the `kyrix-m` instance. 
* `cd Kyrix/tile-server`, then `runts`. You should be able to see some Bigtable testing log, followed by "`Tile server started...`"
* Goto `ip:8900` to see the app. `ip` is the public ip of the `kyrix-m` instance. 

## Development
