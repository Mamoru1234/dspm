#!/bin/bash

if [ ! -d build/dist ]
then
 echo "Please execute npm run build first"
 exit 1
fi

echo "Packaging deploy"

node build/dist/bin/dspm.js installDist --cache.path=null

cd build/dist

tar -zcvf ../dspm.tar.gz * ../../package.json

cd ../../

# TODO fix envsubst
#export DSPM_VERSION=$(git describe --abbrev=0 --tags)
#envsubst < scripts/dspm > build/dspm
#unset DSPM_VERSION

cp scripts/dspm build/dspm

chmod +x ../dspm
