#!/bin/bash

npm run build

echo "Packaging deploy"

node build/dist/bin/dspm.js distArchive --cache.path=null

# TODO fix envsubst
#export DSPM_VERSION=$(git describe --abbrev=0 --tags)
#envsubst < scripts/dspm > build/dspm
#unset DSPM_VERSION

cp scripts/dspm build/dspm

chmod +x ../dspm
