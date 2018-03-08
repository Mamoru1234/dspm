#!/bin/sh

echo "Packaging deploy"

cd build/dist

tar -zcvf ../dspm.tar.gz * ../../package.json
