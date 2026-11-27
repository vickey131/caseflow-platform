# 1. Component Diagram

```mermaid
flowchart TB
    Shell["Application Shell - implemented"]
    List["Case List Page - implemented shell"]
    Create["Case Create Page - implemented shell"]
    Detail["Case Detail Page - implemented shell"]
    Cases["Cases Feature"]
    Model["Case DTO and mapper - implemented"]
    UIKit["UI Kit dependency - integrated"]
    API["API Layer - planned"]

    Shell --> List
    Shell --> Create
    Shell --> Detail
    List --> Cases
    Create --> Cases
    Detail --> Cases
    Cases --> Model
    Cases --> API
    Shell --> UIKit
```

# 2. Data-flow Diagram

```mermaid
flowchart LR
    User["User interaction"]
    UI["UI"]
    APILayer["API layer - planned"]
    Validate["Validate DTO and map to Case - implemented"]
    Backend["Backend/API response"]
    Return["Data returned to UI"]

    User --> UI
    UI -->|Contract request| APILayer
    APILayer -->|Contract request| Backend
    Backend -->|Case or case-list response| APILayer
    APILayer --> Validate
    Validate --> Return
    Return --> UI
```

# 3. State Taxonomy

| State type | Purpose | CaseFlow example | Where it belongs |
|---|---|---|---|
| Server state | Remote API data and request status | Case list or detail response | Cases feature API/hooks |
| URL state | Shareable navigation and list configuration | `/cases` and `/cases/:id` with search parameters | React Router/pages |
| Form state | Temporary create/edit input and validation | New-case title and description draft | Create/edit form component |
| Local UI state | Ephemeral behavior within one component | Open row action or loading/error display | Owning page/component |
| Global client state | State shared across distant features | Simulated user role or session context | Application-level client state |
| Tool selection state | Tracks the active UI tool or action | Not currently applicable; no tool-selection workflow is defined. | Not applicable until required. |
