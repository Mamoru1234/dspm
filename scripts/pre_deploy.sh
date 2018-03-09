#!/bin/sh

echo "Packaging deploy"

node build/dist/bin/dspm.js installDist --cache.path=null

cd build/dist

tar -zcvf ../dspm.tar.gz * ../../package.json
