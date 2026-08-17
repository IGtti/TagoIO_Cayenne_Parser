// Custom payload parser for the LoRaWAN data from AWS IoT Core - Ziorum IoT
//
// Iaran Gadotti
// Date: 16/Ago/2026
// Version: 01.00


const awsReceivedData = raw_payload.find(temp => temp.variable === "aws_payload");  // raw_payload is the received data before AWS parser
const awsParsedJSON = JSON.parse(awsReceivedData.value);                            // value field is a string JSON, need to be parsed
const sensor_payload = awsParsedJSON.PayloadData;                                   // awsParsedJSON is an objeto, not an array. Fields can be accessed directly
let lora_gtw_rxtime = awsParsedJSON.WirelessMetadata.LoRaWAN.Timestamp;

//console.log("myPayloadData:", sensor_payload);
//console.log("myTimestamp:", lora_gtw_rxtime);

payload = [];                                                                       // clean the payload array

if (typeof lora_gtw_rxtime === "undefined") {
    console.log("Timestamp does not exist");
    lora_gtw_rxtime = null;                                                         // if Timestamp is not available, takes TagoIO system time in the platform
}

if(sensor_payload) {
    const sensor_buffer = Buffer.from(sensor_payload, 'base64');                    // convert from Base64 to Javascript buffer
    //console.log("sensor_buffer:", sensor_buffer);
    const bsize = sensor_buffer.byteLength;                                         // buffer size in bytes
    let bindex;                                                                     // buffer index
    let svalue;                                                                     // sensor value
    let schannel;                                                                   // sensor channel
    let stype;                                                                      // sensor type

    for(bindex = 0; bindex < bsize; ) {
        schannel = sensor_buffer[bindex++];                                         // get sensor channel
        stype = sensor_buffer[bindex++];                                            // get sensor type

        switch(stype) {
            case 0x00:                                                               // Digital Input
                svalue = sensor_buffer[bindex++] & 0xFF;                             // get the sensor value
                payload.push({"variable": "digin" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});     // build the decoded payload
                break;

            case 0x02:                                                               // Analog input (signed value)
                svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;              // get the sensor value
                if(svalue > 0x7FFF) svalue = svalue - 0x10000;                       // manage negative value
                svalue = svalue / 100;                                               // resolution 0.01
                payload.push({"variable": "anain" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});      // build the decoded payload
                break;
            
            case 0x67:                                                               // Temperature Sensor (signed value)
                svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;              // get the sensor value
                if(svalue > 0x7FFF) svalue = svalue - 0x10000;                       // manage negative value
                svalue = svalue / 10;                                                // resolution 0.1
                //payload.push({"variable": "temp" + (("00"+schannel).slice(-2)), "value": svalue});       // build the decoded payload
                payload.push({"variable": "temp" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});       // build the decoded payload
                break;

            case 0x68:                                                               // Humidity Sensor
                svalue = sensor_buffer[bindex++] & 0xFF;                             // get the sensor value
                svalue = svalue / 2;                                                 // resolution 0.5
                payload.push({"variable": "hmdt" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});      // build the decoded payload
                break;

            case 0x73:                                                               // Barometer, used for Percentage (Level Input)
                svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;             // get the sensor value
                svalue = svalue / 10;                                                // resolution 0.1
                payload.push({"variable": "level" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});     // build the decoded payload
                break;

            default:                                                                 // Sensor type not found
                payload.push({"variable": "error", "value": schannel, "time": lora_gtw_rxtime});              // Output "error" and channel  
        }
    }
}