#!/bin/bash

while true; do

    TZ="America/Los_Angeles" date;

    v=$(curl -s -i -m 5 http://mondial.kyrixdemo.live | head -n 1)
    if [[ "$v" != *"200"* ]]; then
        printf "Subject: Kyrix-J MONDIAL Demo is DOWN\n\nCouldn't connect to Kyrix-J server" | sudo ssmtp -vvv taowenbo1993@gmail.com
    fi

    v=$(curl -s -i -m 5 http://mondial.kyrixdemo.live/kyrix/first | head -n 1)

    if [[ "$v" != *"200"* ]]; then
        printf "Subject: Kyrix-J MONDIAL Demo is DOWN\n\nCouldn't connect to Kyrix server" | sudo ssmtp -vvv taowenbo1993@gmail.com
    fi

    sleep 300;
done

