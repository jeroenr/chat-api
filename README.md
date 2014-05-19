## Chat API

Chat API based on express and Primus

### Setup

1. **Install Chat API**  
```
npm install -g chatapi
```

2. **Start LovePotion**  
```
CHAT_API_PORT=3000 chatapi path/to/config.json
```

3. **Configuration**  
Chat API expects a JSON configuration file when initiated from the command line.  The configuration has the following properties:  
* **property**: [Required] some description

Example configuration:
```json
{
    "property": 60000
}
```