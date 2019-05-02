from bottle import route, run, static_file
import os

@route('/update', method = 'POST')
def hello():
    print "hello"
    os.system('cd /home/ubuntu/Kyrix/front-end/js && git pull && cat embed/API.js globalVar.js jump.js parameter.js staticLayers.js zoom.js zoomButton.js pageOnLoad.js dynamicLayers.js > embed/all.js && cd embed/ && rollup -c')

@route('/kyrix.js')
def get():
    response = static_file('bundle.js', root = '/home/ubuntu/Kyrix/front-end/js/embed/')
    response.set_header("Cache-Control", "no-store")
    return response

run(host = '128.52.164.24', port = 8000, debug = True)
