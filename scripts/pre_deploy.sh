#!/bin/bash

npm run build

echo "Packaging deploy"

node build/dist/bin/dspm.js distArchive

chmod +x ../dspm
