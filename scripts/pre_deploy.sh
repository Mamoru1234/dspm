#!/bin/sh

echo "Packaging deploy"

node build/dist/bin/dspm.js installDist

cd build/dist

tar -zcvf ../dspm.tar.gz * ../../package.json
