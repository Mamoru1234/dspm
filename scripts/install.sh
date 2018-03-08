#!/usr/bin/env sh

wget https://github.com/Mamoru1234/dspm/releases/download/0.0.6/dspm.tar.gz

mkdir -p .dspm
tar -xzf dspm.tar.gz -C .dspm

rm -f dspm.tar.gz

DSPM_BIN_PATH=$(pwd)"/.dspm/bin/dspm.js"

chmod +x "$DSPM_BIN_PATH"
ln -s "$DSPM_BIN_PATH" dspm
