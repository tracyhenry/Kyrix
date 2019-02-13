#!/bin/sh

sed -i "s@1=1@`date +%s`>0@" transforms.js

node nba.js
