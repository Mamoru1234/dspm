#!/usr/bin/env bash

TARGET_PATH=$(realpath $1)

rm -rf "$TARGET_PATH/.dspm"
rm -rf "$TARGET_PATH/dspm"

mkdir -p "$TARGET_PATH/.dspm/dist"

tar -xzf ./build/dspm.tar.gz -C "$TARGET_PATH/.dspm/dist"

DSPM_BIN_PATH="$TARGET_PATH/.dspm/dist/bin/dspm.js"

chmod +x "$DSPM_BIN_PATH"
ln -s "$DSPM_BIN_PATH" "$TARGET_PATH/dspm"
