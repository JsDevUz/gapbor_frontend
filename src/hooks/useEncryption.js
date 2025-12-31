import { useState, useEffect } from 'react';
import clientEncryption from '../utils/encryption';

export const useEncryption = () => {
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [userKeys, setUserKeys] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);

  // Initialize encryption on component mount
  useEffect(() => {
    initializeEncryption();
  }, []);

  const initializeEncryption = async () => {
    try {
      // Check if Web Crypto API is available
      if (!window.crypto || !window.crypto.subtle) {
        console.error('Web Crypto API not available');
        return;
      }

      // Get current user ID from storage or context
      const userId = getCurrentUserId();
      if (!userId) {
        console.log('No user ID found, skipping encryption initialization');
        return;
      }

      console.log(`🔐 Initializing encryption for user: ${userId}`);

      // Check if user already has keys stored locally
      const storedPrivateKey = clientEncryption.getPrivateKey(userId);
      
      if (storedPrivateKey) {
        console.log('🔑 Found existing private key locally');
        setPrivateKey(storedPrivateKey);
        // Generate or retrieve public key
        const keyPair = await clientEncryption.generateKeyPair();
        setUserKeys({
          publicKey: keyPair.publicKey,
          privateKey: storedPrivateKey
        });
      } else {
        console.log('🔑 No local keys found, checking server...');
        
        // Try to get public key from server (this will auto-generate if needed)
        try {
          const response = await fetch(`http://localhost:5001/api/encryption/public/${userId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.isOk && result.publicKey) {
              console.log('📋 Retrieved public key from server');
              
              if (result.message && result.message.includes('auto-generated')) {
                console.log('🔄 Keys were auto-generated, creating local private key...');
                
                // Generate new key pair locally
                const keyPair = await clientEncryption.generateKeyPair();
                
                // Store private key locally
                clientEncryption.storePrivateKey(userId, keyPair.privateKey);
                setPrivateKey(keyPair.privateKey);
                
                setUserKeys({
                  publicKey: result.publicKey, // Use server's public key
                  privateKey: keyPair.privateKey
                });
                
                console.log('✅ Generated and stored new encryption keys');
              } else {
                // User already had keys on server, generate matching pair locally
                const keyPair = await clientEncryption.generateKeyPair();
                clientEncryption.storePrivateKey(userId, keyPair.privateKey);
                setPrivateKey(keyPair.privateKey);
                setUserKeys({
                  publicKey: result.publicKey,
                  privateKey: keyPair.privateKey
                });
                console.log('✅ Retrieved existing keys from server');
              }
            }
          }
        } catch (error) {
          console.error('❌ Failed to get keys from server:', error);
        }
      }
      
      setIsEncryptionReady(true);
      console.log('🎉 Encryption initialization completed');
    } catch (error) {
      console.error('❌ Error initializing encryption:', error);
    }
  };

  const getCurrentUserId = () => {
    // Get user ID from your auth context or localStorage
    // This depends on your auth implementation
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload._id;
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    return null;
  };

  const sendPublicKeyToServer = async (userId, publicKey) => {
    try {
      const response = await fetch(`http://localhost:5001/api/encryption/generate/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to send public key to server');
      }
      
      const result = await response.json();
      console.log('Public key registered:', result);
    } catch (error) {
      console.error('Error sending public key:', error);
    }
  };

  const encryptMessage = async (content, recipientId) => {
    try {
      if (!isEncryptionReady || !privateKey) {
        throw new Error('Encryption not ready');
      }

      // Get recipient's public key
      const recipientPublicKey = await getRecipientPublicKey(recipientId);
      if (!recipientPublicKey) {
        throw new Error('Recipient public key not found');
      }

      // Generate AES key for this message
      const aesKey = await clientEncryption.generateAESKey();

      // Encrypt message content with AES
      const encryptedContent = await clientEncryption.encryptMessage(content, aesKey);

      // Encrypt AES key with recipient's public key
      const encryptedAESKey = await clientEncryption.encryptAESKey(aesKey, recipientPublicKey);

      // Sign the message
      const signature = await clientEncryption.signMessage(content, privateKey);
      
      console.log('🔏 Signature result:', signature ? 'Created' : 'Skipped');

      return {
        encrypted: true,
        encryptedContent: {
          encrypted: encryptedContent.encrypted,
          iv: encryptedContent.iv,
          authTag: encryptedContent.authTag,
          encryptedAESKey: encryptedAESKey,
          signature: signature // Will be null if signing failed
        }
      };
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  };

  const decryptMessage = async (encryptedMessage) => {
    try {
      if (!isEncryptionReady || !privateKey) {
        throw new Error('Encryption not ready');
      }

      console.log('🔓 Attempting to decrypt message...');
      console.log('📋 Encrypted message structure:', {
        hasEncryptedContent: !!encryptedMessage.encryptedContent,
        hasEncrypted: !!encryptedMessage.encryptedContent?.encrypted,
        hasIv: !!encryptedMessage.encryptedContent?.iv,
        hasAuthTag: !!encryptedMessage.encryptedContent?.authTag,
        hasEncryptedAESKey: !!encryptedMessage.encryptedContent?.encryptedAESKey
      });

      const { encryptedContent } = encryptedMessage;
      
      // Decrypt AES key with recipient's private key
      console.log('🔑 Decrypting AES key...');
      const decryptedAESKey = await clientEncryption.decryptAESKey(
        encryptedContent.encryptedAESKey,
        privateKey
      );

      // Decrypt message content
      console.log('🔓 Decrypting message content...');
      const decryptedContent = await clientEncryption.decryptMessage(
        {
          encrypted: encryptedContent.encrypted,
          iv: encryptedContent.iv,
          authTag: encryptedContent.authTag
        },
        decryptedAESKey
      );

      // Verify signature (only if signature exists)
      if (encryptedContent.signature) {
        try {
          const isSignatureValid = await clientEncryption.verifySignature(
            decryptedContent,
            encryptedContent.signature,
            decryptedAESKey
          );

          if (!isSignatureValid) {
            console.warn('⚠️ Message signature verification failed');
          } else {
            console.log('✅ Message signature verified');
          }
        } catch (sigError) {
          console.warn('⚠️ Signature verification failed:', sigError.message);
        }
      } else {
        console.log('ℹ️ No signature to verify');
      }

      console.log('✅ Message decrypted successfully');
      return decryptedContent;
    } catch (error) {
      console.error('❌ Error decrypting message:', error);
      
      // Provide specific guidance for AES key decryption failures
      if (error.message && error.message.includes('Failed to decrypt AES key')) {
        console.log('🔍 AES key decryption failure detected!');
        console.log('💡 This usually means:');
        console.log('   1. You have old/corrupted keys');
        console.log('   2. Message was encrypted with different keys');
        console.log('   3. Key mismatch between sender and receiver');
        console.log('🔧 Recommended fix:');
        console.log('   1. Run: /fix-decryption.js in console');
        console.log('   2. Clear all encryption keys');
        console.log('   3. Refresh the page');
        console.log('   4. Send a new message to test');
      }
      
      throw error;
    }
  };

  const getRecipientPublicKey = async (recipientId) => {
    try {
      console.log(`🔍 Fetching public key for recipient: ${recipientId}`);
      
      const response = await fetch(`http://localhost:5001/api/encryption/public/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log(`📡 API Response Status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`⚠️ Recipient ${recipientId} has no encryption keys yet`);
          throw new Error('Recipient has no encryption keys');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📋 Public key response:`, result);
      
      if (result.isOk && result.publicKey) {
        console.log(`✅ Public key retrieved for ${recipientId}`);
        return result.publicKey;
      } else {
        console.log(`❌ No public key found for ${recipientId}`);
        throw new Error('Recipient public key not found');
      }
    } catch (error) {
      console.error('❌ Error getting recipient public key:', error);
      return null;
    }
  };

  const encryptGroupMessage = async (content, recipientIds) => {
    try {
      if (!isEncryptionReady || !privateKey) {
        throw new Error('Encryption not ready');
      }

      // Get all recipients' public keys
      const publicKeys = {};
      for (const recipientId of recipientIds) {
        const publicKey = await getRecipientPublicKey(recipientId);
        if (publicKey) {
          publicKeys[recipientId] = publicKey;
        }
      }

      if (Object.keys(publicKeys).length === 0) {
        throw new Error('No valid recipient public keys found');
      }

      // Generate AES key for this message
      const aesKey = await clientEncryption.generateAESKey();

      // Encrypt message content with AES
      const encryptedContent = await clientEncryption.encryptMessage(content, aesKey);

      // Encrypt AES key for each recipient
      const encryptedAESKeys = {};
      for (const [recipientId, publicKey] of Object.entries(publicKeys)) {
        encryptedAESKeys[recipientId] = await clientEncryption.encryptAESKey(aesKey, publicKey);
      }

      // Sign the message
      const signature = await clientEncryption.signMessage(content, aesKey);

      return {
        encrypted: true,
        encryptedContent: {
          encrypted: encryptedContent.encrypted,
          iv: encryptedContent.iv,
          authTag: encryptedContent.authTag,
          encryptedAESKeys: encryptedAESKeys,
          signature: signature
        }
      };
    } catch (error) {
      console.error('Error encrypting group message:', error);
      throw error;
    }
  };

  const decryptGroupMessage = async (encryptedMessage, userId) => {
    try {
      if (!isEncryptionReady || !privateKey) {
        throw new Error('Encryption not ready');
      }

      const { encryptedContent } = encryptedMessage;
      
      // Get the encrypted AES key for this user
      const encryptedKeyForUser = encryptedContent.encryptedAESKeys[userId];
      if (!encryptedKeyForUser) {
        throw new Error('No encrypted key found for this user');
      }

      // Decrypt AES key
      const decryptedAESKey = await clientEncryption.decryptAESKey(encryptedKeyForUser, privateKey);

      // Decrypt message content
      const decryptedContent = await clientEncryption.decryptMessage(
        {
          encrypted: encryptedContent.encrypted,
          iv: encryptedContent.iv,
          authTag: encryptedContent.authTag
        },
        decryptedAESKey
      );

      // Verify signature
      const isSignatureValid = await clientEncryption.verifySignature(
        decryptedContent,
        encryptedContent.signature,
        decryptedAESKey
      );

      if (!isSignatureValid) {
        console.warn('Group message signature verification failed');
      }

      return decryptedContent;
    } catch (error) {
      console.error('Error decrypting group message:', error);
      throw error;
    }
  };

  return {
    isEncryptionReady,
    userKeys,
    encryptMessage,
    decryptMessage,
    encryptGroupMessage,
    decryptGroupMessage,
    getRecipientPublicKey
  };
};
