# Animals in the Amazon Rainforest
<p align="center">
<a href="https://github.com/tracyhenry/Kyrix/tree/master/compiler/examples/USMap">
<img src="https://media.giphy.com/media/efIVT8V355s9Ot0xqH/giphy.gif" width = "700"/>
</a>
</p>

This example is a map of animals in the Amazon rainforest. There are three canvases, each with two layers. One shows background images. The other layer shows the animals. In the top two canvas, animals are previewed as white dots. In the bottom canvas, images of the animals are shown. The background images in the bottom canvas are higher-resolution versions of those in the top canvases.

# Installation Instructions for the Impatient
After running `sudo ./run-kyrix.sh --nba`, open another terminal tab and run the following commands:
```
wget https://www.dropbox.com/s/39ji04m926lfx5i/forest_db_psql.sql     # download data
sudo ./docker-scripts/load-sql.sh forest_db_psql.sql --dbname forest  # load data into the database, must be run in root folder
cp docker-scripts/compile.sh compiler/examples/forest/compile.sh      # copy the compile script
cd compiler/examples/forest                                           # go to the app directory
chmod +x compile.sh                                                   # make the compile script excutable
sudo ./compile.sh forest.js                                           # compile the application
```
Wait for about half a minute, then point your browser at `<ip address>:8000` - remember that if you are using a cloud instance you may (probably) need to open your cloud provider's 
firewall for this port. If that sounds scary, you can create an SSH tunnel from your PC (e.g. Mac) using `ssh -N <server ipaddr> -L 8000:<same ipaddr>:8000` to forward your laptop's port 8000 to the server via [SSH tunneling](https://www.tecmint.com/create-ssh-tunneling-port-forwarding-in-linux/). 

note that you'll need to wait for a message saying `Backend server started...` like this:
```
Serving /project
New project definition coming...
There is diff that requires recomputing indexes. Shutting down server and recomputing...
Precomputing...
Done precomputing!
Completed recomputing indexes. Server restarting...
Backend server started...
```

Please refer to the [tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial) for more details on how to start writing your own Kyrix application!
