#!/usr/bin/env sh

DSPM_VERSION="0.1.1"

echo "Installing dspm version $DSPM_VERSION"

wget "https://github.com/Mamoru1234/dspm/releases/download/$DSPM_VERSION/dspm.tar.gz"

mkdir -p .dspm/dist
tar -xzf dspm.tar.gz -C .dspm/dist

rm -f dspm.tar.gz

DSPM_BIN_PATH=$(pwd)"/.dspm/dist/bin/dspm.js"

chmod +x "$DSPM_BIN_PATH"
ln -s "$DSPM_BIN_PATH" dspm
