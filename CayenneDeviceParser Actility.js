// Custom payload parser to be used with Netmore Actility LNS in Brazil
//
// Iaran Gadotti
// Date: 12/Nov/2026
// Version: 01.00


let lora_gtw_rxtime = payload.find(data => data.variable === "time");            // time stamp
if(lora_gtw_rxtime) {
   lora_gtw_rxtime = lora_gtw_rxtime.value;                                      // no need to convert, timestamp is already in the ISO 8601 format (ex. "2026-11-13T01:11:48.328+00:00")
   //console.log('lora_gtw_rxtime RAW:', lora_gtw_rxtime);                         // print for debugg
} else {
   lora_gtw_rxtime = null;                                                       // in case the rxtime is not available in the package from LNS, takes the Tago IO system time in the platform
}

const sensor_payload = payload.find(data => data.variable === "payload");        // Sensor data
payload = [];                                                                    // clean the payload array

if(sensor_payload) {
   // convert the data from Hex to Javascript Buffer
   const sensor_buffer = Buffer.from(sensor_payload.value, 'hex');               // read string in bytes
   const bsize = sensor_buffer.byteLength;                                       // buffer size in bytes
   let bindex;                                                                   // buffer index
   let svalue;                                                                   // sensor value
   let schannel;                                                                 // sensor channel
   let stype;                                                                    // sensor type

   //payload.push({"variable": "lora_snr", "value": lora_snr, "time": lora_gtw_rxtime});                  // build the decoded payload
   //payload.push({"variable": "lora_rssi", "value": lora_rssi, "time": lora_gtw_rxtime});                // build the decoded payload
   //payload.push({"variable": "lora_outdated", "value": 0, "time": lora_gtw_rxtime});                    // Debug the outdated message

   for(bindex = 0; bindex < bsize; ) {
      schannel = sensor_buffer[bindex++];                                        // get sensor channel
      stype = sensor_buffer[bindex++];                                           // get sensor type

      switch(stype) {
         case 0x00:                                                              // Digital Input
            svalue = sensor_buffer[bindex++] & 0xFF;                             // get the sensor value
            payload.push({"variable": "digin" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});     // build the decoded payload
            break;

         case 0x02:                                                              // Analog input (signed value)
            svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;              // get the sensor value
            if(svalue > 0x7FFF) svalue = svalue - 0x10000;                       // manage negative value
            svalue = svalue / 100;                                               // resolution 0.01
            payload.push({"variable": "anain" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});      // build the decoded payload
            break;
         
         case 0x67:                                                              // Temperature Sensor (signed value)
            svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;              // get the sensor value
            if(svalue > 0x7FFF) svalue = svalue - 0x10000;                       // manage negative value
            svalue = svalue / 10;                                                // resolution 0.1
            //payload.push({"variable": "temp" + (("00"+schannel).slice(-2)), "value": svalue});       // build the decoded payload
            payload.push({"variable": "temp" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});       // build the decoded payload
            break;

         case 0x68:                                                              // Humidity Sensor
            svalue = sensor_buffer[bindex++] & 0xFF;                             // get the sensor value
            svalue = svalue / 2;                                                 // resolution 0.5
            payload.push({"variable": "hmdt" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});      // build the decoded payload
            break;

         case 0x73:                                                              // Barometer, used for Percentage (Level Input)
            svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;             // get the sensor value
            svalue = svalue / 10;                                                // resolution 0.1
            payload.push({"variable": "level" + (("00"+schannel).slice(-2)), "value": svalue, "time": lora_gtw_rxtime});     // build the decoded payload
            break;

         default:                                                                // Sensor type not found
            payload.push({"variable": "error", "value": schannel, "time": lora_gtw_rxtime});              // Output "error" and channel  
      }
   }
}