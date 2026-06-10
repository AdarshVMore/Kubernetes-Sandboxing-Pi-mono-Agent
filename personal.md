4 routes
3 time conditions
redis queue

8 pods
- lease the pod
condition to release the pod :
    - success
    - tool failure
    - timeout
    - cancellation
    - unexpected execution error
Service & Deployment manifest

AI => allowed_commands
context management
session management


Log at least:

- chat request started
- chat request completed
- tool call requested
- queue wait started
- queue wait completed
- queue wait timed out
- Lease acquire attempted
- Lease acquired
- Lease conflict
- Lease released
- tool execution started
- tool execution completed
- tool execution failed
- tool execution timed out