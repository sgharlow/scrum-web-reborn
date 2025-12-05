# Requirements Document

## Introduction

This feature addresses a critical authentication bug where users cannot create new accounts due to a configuration mismatch between the Cognito User Pool setup and the sign-up implementation. The User Pool is configured with `signInAliases` (allowing sign-in with email OR username), but the code attempts to use email as the username during sign-up, which Cognito rejects with "Username cannot be of email format, since user pool is configured for email alias." This prevents all new user registrations.

## Glossary

- **Cognito User Pool**: AWS service that manages user accounts, authentication, and authorization
- **Sign-In Alias**: A Cognito configuration that allows users to sign in using email OR username as alternatives to the primary username
- **Username Attribute**: A Cognito configuration where email IS the username (no separate username field)
- **Auth System**: The authentication layer using AWS Amplify and Cognito
- **Sign-Up Flow**: The process where new users create accounts by providing credentials
- **Username Generation**: Creating a unique, non-email-format identifier for each user account

## Requirements

### Requirement 1: Fix Sign-Up Username Handling

**User Story:** As a new user, I want to create an account using my email address, so that I can access Scrum Reborn without encountering registration errors.

#### Acceptance Criteria

1. WHEN a user submits the sign-up form with a valid email, THE Auth System SHALL generate a unique username that is not in email format
2. WHEN creating a Cognito user account, THE Auth System SHALL use the generated username as the primary identifier and store the email as a user attribute
3. WHEN a user signs in after registration, THE Auth System SHALL accept either the email address or the generated username as valid credentials
4. WHEN generating usernames, THE Auth System SHALL ensure uniqueness to prevent account conflicts
5. WHEN a username generation fails, THE Auth System SHALL retry with a different generated value

### Requirement 2: Maintain Sign-In Compatibility

**User Story:** As an existing user, I want to continue signing in with my email address, so that the fix does not break my current authentication flow.

#### Acceptance Criteria

1. WHEN an existing user signs in with their email address, THE Auth System SHALL authenticate successfully using the email alias feature
2. WHEN the sign-in flow processes credentials, THE Auth System SHALL use email as the username parameter for Cognito authentication
3. WHEN displaying user information, THE Auth System SHALL show the user's email address, not the generated username
4. THE Auth System SHALL maintain backward compatibility with all existing user accounts

### Requirement 3: Username Generation Strategy

**User Story:** As a developer, I want a reliable username generation strategy, so that user accounts are created consistently and predictably.

#### Acceptance Criteria

1. THE Auth System SHALL generate usernames using a combination of a sanitized email prefix and a unique identifier
2. THE Auth System SHALL ensure generated usernames contain only alphanumeric characters and hyphens
3. THE Auth System SHALL limit generated usernames to Cognito's maximum length requirements (128 characters)
4. WHEN the email prefix is too short, THE Auth System SHALL use a minimum length to ensure username validity
5. THE Auth System SHALL use a timestamp or UUID component to guarantee uniqueness across concurrent sign-ups

### Requirement 4: Error Handling and User Feedback

**User Story:** As a user experiencing sign-up issues, I want clear error messages, so that I understand what went wrong and how to proceed.

#### Acceptance Criteria

1. WHEN sign-up fails due to username conflicts, THE Auth System SHALL retry automatically without user intervention
2. WHEN sign-up fails after retry attempts, THE Auth System SHALL display a user-friendly error message
3. WHEN Cognito returns validation errors, THE Auth System SHALL translate technical error messages into clear user guidance
4. THE Auth System SHALL log detailed error information for debugging while showing simplified messages to users

### Requirement 5: Testing and Validation

**User Story:** As a QA engineer, I want to verify the fix works correctly, so that new users can register without errors.

#### Acceptance Criteria

1. THE Auth System SHALL successfully create new user accounts without "Username cannot be of email format" errors
2. WHEN testing sign-up with various email formats, THE Auth System SHALL handle all valid email addresses correctly
3. WHEN testing concurrent sign-ups, THE Auth System SHALL prevent username collisions
4. THE automated test suite SHALL include unit tests for username generation logic
5. THE E2E test suite SHALL validate the complete sign-up flow with the new username handling
