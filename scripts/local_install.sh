#!/usr/bin/env bash

TARGET_PATH=$(realpath $1)

npm run build
./scripts/pre_deploy.sh

rm -rfv "$TARGET_PATH/.dspm"
rm -rfv "$TARGET_PATH/dspm"

echo "installing dspm..."

mkdir -p "$TARGET_PATH/.dspm/dist"

tar -xzf ./build/dspm.tar.gz -C "$TARGET_PATH/.dspm/dist"

DSPM_BIN_PATH="$TARGET_PATH/.dspm/dist/bin/dspm.js"

chmod +x "$DSPM_BIN_PATH"
ln -s "$DSPM_BIN_PATH" "$TARGET_PATH/dspm"

echo "Installed"
