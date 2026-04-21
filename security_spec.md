# Security Specification - SkillSwap

## Data Invariants
1. A user cannot have a negative credit balance (unless explicitly allowed by anti-abuse rules, but we'll start strict).
2. Users can only modify their own profile (except for credits which are updated via sessions).
3. A session must have a valid mentor, learner, and skill.
4. Credit exchange happens only when a session is marked as 'completed'.
5. Only the mentor of a session can mark it as 'accepted' or 'completed'.
6. Only participants (mentor or learner) can view session details.

## The Dirty Dozen (Attack Payloads)

1. **Identity Spoofing**: Create a skills listing with someone else's `ownerId`.
2. **Infinite Wealth**: Directly update `credits` field in own user profile document.
3. **Ghost Session**: Create a session where the user is neither the mentor nor the learner.
4. **Premature Completion**: Learner marks a session as 'completed' to drain credits early or just to skip.
5. **Double Dip**: Trying to mark a 'completed' session as 'completed' again to trigger secondary credit transfer logic (though rules should handle status transitions).
6. **Malicious ID**: Using a 1MB string as a `skillId` to bloat database costs.
7. **Cross-Tenant Read**: User A trying to read Session details between User B and User C.
8. **Feedback Injection**: User A (not in session) posting feedback on a session they weren't part of.
9. **Negative Session**: Setting `durationMinutes` to -60 to try and gain credits as a learner.
10. **Admin Escalation**: Attempting to set an `isAdmin` field in the user profile (even though we don't have admins yet, it's a standard check).
11. **Time Travel**: Setting `createdAt` to a year ago to appear as a veteran user.
12. **Spam Listing**: Creating 10,000 skill listings in a loop (rule-level rate limiting is hard, but size checks help).

## Test Runner (firestore.rules.test.ts)
*I will implement the rules to block these.*
