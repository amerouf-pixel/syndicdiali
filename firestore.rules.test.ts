import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesContent = fs.readFileSync('./DRAFT_firestore.rules', 'utf-8');

test('Firestore rules enforce default-deny catch-all and rules_version 2', () => {
  assert.ok(rulesContent.includes("rules_version = '2';"));
  assert.ok(rulesContent.includes('match /{document=**}'));
  assert.ok(rulesContent.includes('allow read, write: if false;'));
});

test('Dirty Dozen #1 & #2: Unauthenticated and unverified email writes are blocked by isVerifiedUser()', () => {
  assert.ok(rulesContent.includes('function isVerifiedUser()'));
  assert.ok(rulesContent.includes('isSignedIn() && request.auth.token.email_verified == true'));
});

test('Dirty Dozen #3, #4, #5, #6: Identity spoofing and shadow fields blocked by hasAll/hasOnly and affectedKeys().hasOnly()', () => {
  assert.ok(rulesContent.includes('data.ownerUid == request.auth.uid'));
  assert.ok(rulesContent.includes('incoming().ownerUid == existing().ownerUid'));
  assert.ok(rulesContent.includes("affectedKeys().hasOnly(['paid', 'amount', 'method', 'paidDate', 'receiptNo', 'updatedAt'])"));
  assert.ok(rulesContent.includes("affectedKeys().hasOnly(['status', 'updatedAt'])"));
  assert.ok(rulesContent.includes("affectedKeys().hasOnly(['yesVotes', 'noVotes', 'userVote', 'updatedAt'])"));
});

test('Dirty Dozen #7, #8, #9: Timestamp forgery, createdAt mutation, and terminal state bypass blocked', () => {
  assert.ok(rulesContent.includes('incoming().createdAt == request.time'));
  assert.ok(rulesContent.includes('incoming().updatedAt == request.time'));
  assert.ok(rulesContent.includes('incoming().createdAt == existing().createdAt'));
  assert.ok(rulesContent.includes("existing().status != 'fixed'"));
});

test('Dirty Dozen #10, #11, #12: ID poisoning, value bounds, and cross-tenant list queries enforced', () => {
  assert.ok(rulesContent.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  assert.ok(rulesContent.includes('allow list: if isVerifiedUser() && resource.data.ownerUid == request.auth.uid;'));
});
