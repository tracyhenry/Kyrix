# NBA Basketball Data Visualization (with two views)

<p align="center">
<a href="https://github.com/tracyhenry/Kyrix/tree/master/compiler/examples/USMap">
<img src="https://media.giphy.com/media/LSoUc3oBfbTa484WEy/giphy.gif" width = "700"/>
</a>
</p>

This example app is a variant of the default NBA application with two coordinated views. The view on the left shows the logos of 30 NBA teams. When clicking on a team, the user can populate the view on the right with the schedule of the clicked team. This schedule is pannable, and allows the user to click on a game to zoom into the boxscore/play-by-play canvas, similar to the default NBA app. 

A key functionality this variant app enables is coordinated selection. Say the view on the right is showing the schedule of the the Boston Celtics. The user can click on another team in the left view, say the Golden State Warriors, to highlight the games between the Celtics and the Warriors. 

# Installation Instructions for the Impatient
After running `sudo ./run-kyrix.sh --nba`, open another terminal tab and run the following commands:

```
cp docker-scripts/compile.sh compiler/examples/nba_cmv/compile.sh    # copy the compile script (run in the root folder)
cd compiler/examples/nba_cmv                                         # go to the app directory
chmod +x compile.sh                                                  # make the compile script excutable
sudo ./compile.sh nba_cmv.js                                         # compile the application
```
Wait for about one minute, then point your browser at `<ip address>:8000` - remember that if you are using a cloud instance you may (probably) need to open your cloud provider's firewall for this port. If that sounds scary, you can create an SSH tunnel from your PC (e.g. Mac) using `ssh -N <server ipaddr> -L 8000:<same ipaddr>:8000` to forward your laptop's port 8000 to the server via [SSH tunneling](https://www.tecmint.com/create-ssh-tunneling-port-forwarding-in-linux/). 

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
