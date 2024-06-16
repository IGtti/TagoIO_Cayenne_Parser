// This is a custom payload parser to be used in the LoRaWAN, LoRaP2P and WiFi data for TellMee devices

// Add ignorable variables in this array.
const ignore_vars = ['time', 'packet_id', 'gateway', 'delay', 'datarate', 'modulation_bandwidth', 'modulation_type', 'modulation_type', 'modulation_coderate', 'hardware_status', 'hardware_chain',
 'hardware_tmst', 'freq', 'size', 'port', 'duplicate', 'counter_up', 'encrypted_payload', 'header_class_b', 'header_confirmed', 'header_adr', 'header_ack', 'header_adr_ack_req', 'header_version',
  'header_type', 'Status_Channel_mask_ACK', 'Status_Data_rate_ACK', 'Status_Power_ACK', 'Status_Channel_mask_ACK', 'Status_Data_rate_ACK', 'Status_Power_ACK', 'Status_Channel_mask_ACK', 'Status_Data_rate_ACK',
   'Status_Power_ACK', 'Status_RX2_Data_rate_ACK', 'Status_Channel_ACK', 'Status_RX1DRoffset_ACK', 'rx_time', 'modulation_spreading', 'hardware_channel', 'gps_location', 'gps_alt', 'outdated', 'gps_time',
'hardware_snr', 'hardware_rssi'];

// Remove unwanted variables
payload = payload.filter(x => !ignore_vars.includes(x.variable));

// Find the Payload
//var lora_snr = payload.find(data => data.variable === "hardware_snr");           // SNR
//if(lora_snr) lora_snr = lora_snr.value;

//var lora_rssi = payload.find(data => data.variable === "hardware_rssi");         // RSSI
//if(lora_rssi) lora_rssi = lora_rssi.value;

//var lora_gtw_location = payload.find(data => data.variable === "gps_location");  // Gateway location
//if(lora_gtw_location) lora_gtw_location = lora_gtw_location.location;

const sensor_payload = payload.find(data => data.variable === "payload");          // Sensor data

if(sensor_payload) {
   // convert the data from Hex to Javascript Buffer
   const sensor_buffer = Buffer.from(sensor_payload.value, 'hex');               // read string in bytes
   const bsize = sensor_buffer.byteLength;                                       // buffer size in bytes
   var bindex;                                                                   // buffer index
   var svalue;                                                                   // sensor value
   var schannel;                                                                 // sensor channel
   var stype;                                                                    // sensor type

   payload = [];                                                                 // clean the payload array
   //payload.push({"variable": "lora_snr", "value": lora_snr});                  // build the decoded payload
   //payload.push({"variable": "lora_rssi", "value": lora_rssi});                // build the decoded payload

   for(bindex = 0; bindex < bsize; ) {
      schannel = sensor_buffer[bindex++];                                        // get sensor channel
      stype = sensor_buffer[bindex++];                                           // get sensor type

      switch(stype) {
         case 0x00:                                                              // Digital Input
            svalue = sensor_buffer[bindex++] & 0xFF;                             // get the sensor value
            payload.push({"variable": "digin" + (("00"+schannel).slice(-2)), "value": svalue});     // build the decoded payload
            break;

         case 0x02:                                                              // Analog input (signed value)
            svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;              // get the sensor value
            if(svalue > 0x7FFF) svalue = svalue - 0x10000;                       // manage negative value
            svalue = svalue / 100;                                               // resolution 0.01
            payload.push({"variable": "anain" + (("00"+schannel).slice(-2)), "value": svalue});      // build the decoded payload
            break;
         
         case 0x67:                                                              // Temperature Sensor (signed value)
            svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;              // get the sensor value
            if(svalue > 0x7FFF) svalue = svalue - 0x10000;                       // manage negative value
            svalue = svalue / 10;                                                // resolution 0.1
            payload.push({"variable": "temp" + (("00"+schannel).slice(-2)), "value": svalue});       // build the decoded payload
            break;

         case 0x68:                                                              // Humidity Sensor
            svalue = sensor_buffer[bindex++] & 0xFF;                             // get the sensor value
            svalue = svalue / 2;                                                 // resolution 0.5
            payload.push({"variable": "hmdt" + (("00"+schannel).slice(-2)), "value": svalue});      // build the decoded payload
            break;

         case 0x73:                                                              // Barometer, used for Percentage (Level Input)
            svalue = (sensor_buffer[bindex++] << 8 | sensor_buffer[bindex++]) & 0xFFFF;             // get the sensor value
            svalue = svalue / 10;                                                // resolution 0.1
            payload.push({"variable": "level" + (("00"+schannel).slice(-2)), "value": svalue});     // build the decoded payload
            break;

         default:                                                                // Sensor type not found
            payload.push({"variable": "error", "value": schannel});              // Output "error" and channel  
      }
   }
}