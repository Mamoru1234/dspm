import Promise from 'bluebird';
import crypto from 'crypto';
import {cleartext, key, verify, VerifyOptions, VerifyResult} from 'openpgp';
import Key = key.Key;

export function verifyMessage(data: string, publicKey: Key): Promise<string> {
  return Promise.resolve(cleartext.readArmored(data))
    .then((message) => {
      const verifyOptions: VerifyOptions = {
        message,
        publicKeys: [publicKey],
      };
      return verify(verifyOptions);
    })
    .then((verifyResult: VerifyResult) => {
      verifyResult.signatures.forEach(({ keyid, valid }) => {
        if (!valid) {
          throw new Error(`Invalid signature ${keyid}`);
        }
      });
      return verifyResult.data;
    });
}

export function verifyJson(data: any, signature: string, publicKey: Key): Promise<boolean> {
  return verifyMessage(signature, publicKey)
    .then((message) => {
      const [algorithm, hashValue] = message.split('-');
      const hash = crypto.createHash(algorithm);
      hash.update(JSON.stringify(data));
      return hash.digest('base64') === hashValue;
    });
}
