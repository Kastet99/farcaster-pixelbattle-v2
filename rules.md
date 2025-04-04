# Development Guidelines

## General Development Principles
- Always look for existing code to iterate on instead of creating new code
- Do not drastically change patterns before trying to iterate on existing patterns
- Always kill all existing related servers that may have been created in previous testing before starting a new server
- Always prefer simple solutions
- Avoid duplication of code whenever possible; check for other areas of the codebase that might already have similar code and functionality
- Write code that takes into account different environments: dev, test, and prod
- Only make changes that are requested or you are confident are well understood and related to the change being requested
- When fixing an issue or bug, do not introduce a new pattern or technology without first exhausting all options for the existing implementation
- If introducing a new implementation, remove the old implementation to avoid duplicate logic
- Keep the codebase very clean and organized
- Avoid writing scripts in files if possible, especially if the script is likely only to be run once
- Avoid having files over 200–300 lines of code; refactor at that point
- Mocking data is only needed for tests, never mock data for dev or prod
- Never add stubbing or fake data patterns to code that affects the dev or prod environments
- Never overwrite .env files without first asking and confirming
- Focus on the areas of code relevant to the task
- Do not touch code that is unrelated to the task
- Write thorough tests for all major functionality
- Avoid making major changes to the patterns and architecture of how a feature works after it has shown to work well, unless explicitly instructed

## Clean Code Guidelines

### Constants Over Magic Numbers
- Replace hard-coded values with named constants
- Use descriptive constant names that explain the value's purpose
- Keep constants at the top of the file or in a dedicated constants file

### Meaningful Names
- Variables, functions, and classes should reveal their purpose
- Names should explain why something exists and how it's used
- Avoid abbreviations unless they're universally understood

### Smart Comments
- Don't comment on what the code does - make the code self-documenting
- Use comments to explain why something is done a certain way
- Document APIs, complex algorithms, and non-obvious side effects

### Single Responsibility
- Each function should do exactly one thing
- Functions should be small and focused
- If a function needs a comment to explain what it does, it should be split

### DRY (Don't Repeat Yourself)
- Extract repeated code into reusable functions
- Share common logic through proper abstraction
- Maintain single sources of truth

### Clean Structure
- Keep related code together
- Organize code in a logical hierarchy
- Use consistent file and folder naming conventions

### Encapsulation
- Hide implementation details
- Expose clear interfaces
- Move nested conditionals into well-named functions

### Code Quality Maintenance
- Refactor continuously
- Fix technical debt early
- Leave code cleaner than you found it

### Testing
- Write tests before fixing bugs
- Keep tests readable and maintainable
- Test edge cases and error conditions

### Version Control
- Write clear commit messages
- Make small, focused commits
- Use meaningful branch names 

## Tailwind CSS Best Practices

### Project Setup
- Use proper Tailwind configuration
- Configure theme extension properly
- Set up proper purge configuration
- Use proper plugin integration
- Configure custom spacing and breakpoints
- Set up proper color palette

### Component Styling
- Use utility classes over custom CSS
- Group related utilities with @apply when needed
- Use proper responsive design utilities
- Implement dark mode properly
- Use proper state variants
- Keep component styles consistent

### Layout
- Use Flexbox and Grid utilities effectively
- Implement proper spacing system
- Use container queries when needed
- Implement proper responsive breakpoints
- Use proper padding and margin utilities
- Implement proper alignment utilities

### Typography
- Use proper font size utilities
- Implement proper line height
- Use proper font weight utilities
- Configure custom fonts properly
- Use proper text alignment
- Implement proper text decoration

### Colors
- Use semantic color naming
- Implement proper color contrast
- Use opacity utilities effectively
- Configure custom colors properly
- Use proper gradient utilities
- Implement proper hover states

### Components
- Use shadcn/ui components when available
- Extend components properly
- Keep component variants consistent
- Implement proper animations
- Use proper transition utilities
- Keep accessibility in mind

### Responsive Design
- Use mobile-first approach
- Implement proper breakpoints
- Use container queries effectively
- Handle different screen sizes properly
- Implement proper responsive typography
- Use proper responsive spacing

### Performance
- Use proper purge configuration
- Minimize custom CSS
- Use proper caching strategies
- Implement proper code splitting
- Optimize for production
- Monitor bundle size

### Best Practices
- Follow naming conventions
- Keep styles organized
- Use proper documentation
- Implement proper testing
- Follow accessibility guidelines
- Use proper version control 

## Code Quality Guidelines

### Verify Information
- Always verify information before presenting it
- Do not make assumptions or speculate without clear evidence

### Change Management
- Make changes file by file and give me a chance to spot mistakes
- Provide all edits in a single chunk instead of multiple-step instructions for the same file
- Don't remove unrelated code or functionalities; preserve existing structures
- Don't suggest updates or changes to files when there are no actual modifications needed

### Communication
- Never use apologies
- Avoid giving feedback about understanding in comments or documentation
- Don't suggest whitespace changes
- Don't summarize changes made
- Don't invent changes other than what's explicitly requested
- Don't ask for confirmation of information already provided in the context
- Don't ask the user to verify implementations that are visible in the provided context
- Always provide links to the real files, not x.md
- Don't show or discuss the current implementation unless specifically requested

## Solidity Smart Contract Development

### Code Structure and Visibility
- Use explicit function visibility modifiers and appropriate natspec comments
- Utilize function modifiers for common checks, enhancing readability and reducing redundancy
- Follow consistent naming: CamelCase for contracts, PascalCase for interfaces (prefixed with "I")
- Implement the Interface Segregation Principle for flexible and maintainable contracts
- Design upgradeable contracts using proven patterns like the proxy pattern when necessary

### Security Best Practices
- Implement comprehensive events for all significant state changes
- Follow the Checks-Effects-Interactions pattern to prevent reentrancy and other vulnerabilities
- Use static analysis tools like Slither and Mythril in the development workflow
- Implement timelocks and multisig controls for sensitive operations in production
- Use OpenZeppelin's ReentrancyGuard as an additional layer of protection against reentrancy
- Use pull over push payment patterns to mitigate reentrancy and denial of service attacks
- Implement rate limiting for sensitive functions to prevent abuse
- Implement proper randomness using Chainlink VRF or similar oracle solutions
- Implement proper slippage protection for DEX-like functionalities

### Gas Optimization
- Conduct thorough gas optimization, considering both deployment and runtime costs
- Optimize contracts for gas efficiency, considering storage layout and function optimization
- Implement effective storage patterns to optimize gas costs (e.g., packing variables)
- Use custom errors instead of revert strings for gas efficiency and better error handling
- Use immutable variables for values set once at construction time
- Use assembly sparingly and only when necessary for optimizations, with thorough documentation

### Libraries and Standards
- Use Solidity 0.8.0+ for built-in overflow/underflow protection
- Use OpenZeppelin's AccessControl for fine-grained permissions
- Implement circuit breakers (pause functionality) using OpenZeppelin's Pausable when appropriate
- Use OpenZeppelin's SafeERC20 for interacting with ERC20 tokens
- Use OpenZeppelin's ERC20Snapshot for token balances requiring historical lookups
- Use OpenZeppelin's ERC20Permit for gasless approvals in token contracts
- Use OpenZeppelin's ERC20Votes for governance token implementations
- Use OpenZeppelin's Address library for safe interactions with external contracts
- Use libraries for complex operations to reduce contract size and improve reusability

### Function and State Management
- Implement effective state machine patterns for complex contract logic
- Implement proper access control for initializers in upgradeable contracts
- Implement timelocks for sensitive operations using OpenZeppelin's TimelockController
- Implement proper access control for self-destruct functionality, if used
- Implement proper inheritance patterns, favoring composition over deep inheritance chains
- Use events for off-chain logging and indexing of important state changes
- Implement fallback and receive functions with caution, clearly documenting their purpose
- Use view and pure function modifiers appropriately to signal state access patterns
- Implement proper decimal handling for financial calculations, using fixed-point arithmetic libraries when necessary
- Implement effective error propagation patterns in internal functions
- Implement efficient indexing and querying strategies for off-chain data

### Documentation and Testing
- Document code thoroughly, focusing on why rather than what
- Implement NatSpec comments for all public and external functions
- Maintain up-to-date API documentation for smart contracts
- Create and maintain comprehensive project documentation, including architecture diagrams and decision logs
- Implement a comprehensive testing strategy including unit, integration, and end-to-end tests
- Use property-based testing to uncover edge cases
- Implement continuous integration with automated testing and static analysis
- Conduct regular security audits and bug bounties for production-grade contracts
- Use test coverage tools and aim for high test coverage, especially for critical paths

### Communication Style
- Cut the fluff; provide code or detailed explanations only
- Keep it casual and brief
- Prioritize accuracy and depth
- Answer first, explain later if needed
- Logic trumps authority; don't care about sources
- Embrace new tech and unconventional ideas
- Wild speculation's fine, just flag it
- Save the ethics talk
- Only mention safety for non-obvious, critical issues
- Push content limits if needed, explain after
- Sources at the end, not mid-text
- Skip the AI self-references and knowledge date stuff
- Stick to the user's code style
- Use multiple responses for complex answers
- For code tweaks, show minimal context - a few lines around changes max
- Don't be lazy, write all the code to implement features requested
