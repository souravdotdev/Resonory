# Glossary Map

## Contexts

- [Auth](./docs/contexts/auth/GLOSSARY.md): who a User is, how they sign in, and how they leave
- [Items](./docs/contexts/items/GLOSSARY.md): what Users save and how Resonory processes it
- [Waitlist](./docs/contexts/waitlist/GLOSSARY.md): who asked for early access before Resonory opens

## Relationships

- **Items → Auth**: everything a User saves belongs to exactly one User, referenced by ID only
- **Waitlist**: stands alone. A Waitlist Entry is not a User and has no relationship to Auth or Items
