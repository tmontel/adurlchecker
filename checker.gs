var CAMPAIGN_NAME = ['Your_campaign1', 'Your_campaign2'];

var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/your_custom_spreadsheet_url';

var EMAIL_ADDRESS = 'you@email.com';

var mailBodyPaused = '';
var mailBodyEnabled = '';

function main() {
   var i = 0;
   while (i < CAMPAIGN_NAME.length) {
 
    var campaignIterator = AdWordsApp.campaigns().withCondition("Name='"+CAMPAIGN_NAME[i]+"'").get();
    if(campaignIterator.hasNext()){
      var adGroupIterator = campaignIterator.next().adGroups().get();
      
      while (adGroupIterator.hasNext()) {
        var adGroup = adGroupIterator.next();
        
        var adsIterator = adGroup.ads().get();
        while (adsIterator.hasNext()) {
          var ad = adsIterator.next();
          checkAd(ad, CAMPAIGN_NAME[i]);
        }
      }
    }
    i++;
   }
   if(mailBodyPaused != "") { sendMailPaused(EMAIL_ADDRESS, mailBodyPaused); }
   if(mailBodyEnabled != "") { sendMailEnabled(EMAIL_ADDRESS, mailBodyEnabled); }
}

function checkAd(ad, campaignName) {
  
  //logAd(ad);
  
  var url = ad.getDestinationUrl();
  
  url = replaceChar(url, '{', "%7B");
  url = replaceChar(url, '}', "%7D");
  url = replaceChar(url, '|', "%7C");
  
  var online = isOnlineUrl(url);
  
  if(ad.isEnabled()) {
   //Logger.log('ENABLE'); 
   if(!online) {
     var text_status = 'OFFLINE';
     ad.pause();
     remoteStorage.setItem(ad.getId(), 'PAUSED');
     mailBodyPaused += '<tr><td style="border: 1px solid black;border-collapse: collapse;padding: 5px;">' + campaignName + '</td><td style="border: 1px solid black;border-collapse: collapse;padding: 5px;">' + ad.getId() + '</td></tr>';
   }
    else{
      var text_status = 'ONLINE';
    }
  }
  else {
    //Logger.log('PAUSED'); 
    if(!online) {
     var text_status = 'OFFLINE';
   }
    else{
      var text_status = 'ONLINE';
      if(remoteStorage.getItem(ad.getId()) == 'PAUSED') {
        ad.enable();
        remoteStorage.removeItem(ad.getId());
        mailBodyEnabled += '<tr><td style="border: 1px solid black;border-collapse: collapse;padding: 5px;">' + campaignName + '</td><td style="border: 1px solid black;border-collapse: collapse;padding: 5px;">' + ad.getId() + '</td></tr>';
      }
    }
  }
}

function logAd(ad) {
  Logger.log('ID : ' + ad.getId());
  Logger.log('Headline : ' + ad.getHeadline());
  Logger.log('Approval Status : ' + ad.getApprovalStatus());
  Logger.log('Enabled : ' + ad.isEnabled());
  Logger.log('Destination url : ' + ad.getDestinationUrl());  
}

function sendMailPaused(email, mailBodyPaused) {
  MailApp.sendEmail({
    to: email,
    subject: 'Adwords Crawler | Ads PAUSED',
    htmlBody: 'Hi,<br/><br/>Ads was <b><font color="red">paused</font></b> because offline destination URL has been detected: <br/><br/><table style="border: 1px solid black;border-collapse: collapse;"><tr><th>Campaign</th><th style="border: 1px solid black;border-collapse: collapse;padding: 5px;">Ads ID</th></tr>' + mailBodyPaused + '</table>'
  });
}

function sendMailEnabled(email, mailBodyEnabled) {
  MailApp.sendEmail({
    to: email,
    subject: 'Adwords Crawler | Ads ENABLED',
    htmlBody: 'Hi,<br/><br/>Ads was <b><font color="green">enabled</font></b> because online destination URL has been detected: <br/><br/><table style="border: 1px solid black;border-collapse: collapse;"><tr><th style="border: 1px solid black;border-collapse: collapse;padding: 5px;">Campaign</th><th>Ads ID</th></tr>' + mailBodyEnabled + '</table>'
  });
}

function isOnlineUrl(a_sURLToCheck) {
  
  if (a_sURLToCheck.length == 0) return "";
  
  // Request the URL
  try {
    
    var response = UrlFetchApp.fetch(a_sURLToCheck, { muteHttpExceptions: true });
    
    // Seem ok,
    if (response.getResponseCode() >= 200 && response.getResponseCode() <= 299) {
      
      // Check the URL for meta-refresh redirection
      var head = response.getContentText().toLowerCase();
      if (head.indexOf("http-equiv=\"refresh") != -1 || head.indexOf("http-equiv='refresh") != -1 || head.indexOf("http-equiv=refresh") != -1) { 
        // Redirection detected
        //return "Redirection: 302";
        return true;
      }
      else {
        // Ok
        //return "OK: " + response.getResponseCode();
        return true;
      }
    } 
    
    // Detect server redirection code
    if (response.getResponseCode() >= 300 && response.getResponseCode() <= 399) return false;//return "Redirection: " + response.getResponseCode();
    
    // Detect not found code
    if (response.getResponseCode() >= 400 && response.getResponseCode() <= 499) return false;//return "Not found: " + response.getResponseCode();
    
    // Detect error code
    if (response.getResponseCode() >= 500 && response.getResponseCode() <= 599) return false;//return "Error: " + response.getResponseCode();
    
    // Other type of error
    return false;//return "Error: " + response.getResponseCode();
  }
  catch (e) {
    // Other type of error
    Logger.log(e);
    return false;//return "Error";
  }
}

function replaceChar(str, char, CharReplacement) {
  while(str.indexOf(char) != -1) {
    str = str.replace(char, CharReplacement);
  }
  return str;
}

var remoteStorage = (function() {
  'use strict';
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = spreadsheet.getSheetByName('_remoteStorage') !== null ?
      spreadsheet.getSheetByName('_remoteStorage') :
      spreadsheet.insertSheet('_remoteStorage');
  var length = sheet.getDataRange().getValues().length;
  return {
    getItem: function(key) {
      if (!key) {
        return;
      }
      key = key.toString();
      var values = sheet.getDataRange().getValues();
      for (var i = 0, lenI = values.length; i < lenI; i++) {
        var currentKey = values[i][0].toString();
        if (currentKey === key && values[i][1]) {
          return JSON.parse(values[i][1]);
        }
      }
      return null;
    },
    setItem: function(key, value) {
      if (!key || !value) {
        return;
      }
      key = key.toString();
      value = JSON.stringify(value);
      var values = sheet.getDataRange().getValues();
      for (var i = 0, lenI = values.length; i < lenI; i++) {
        var currentKey = values[i][0].toString();
        if (currentKey === key) {
          var range =  sheet.getRange(i + 1, 1, 1, 2);
          length++;
          return range.setValues([[key, value]]);
        }
      }
      length++;
      return sheet.appendRow([key, value]);
    },
    removeItem: function(key) {
      if (!key) {
        return;
      }
      key = key.toString();
      var values = sheet.getDataRange().getValues();
      for (var i = 0, lenI = values.length; i < lenI; i++) {
        var currentKey = values[i][0].toString();
        if (currentKey === key) {
          length--;
          return sheet.deleteRow(i + 1);
        }
      }
    },
    key: function(index) {
      var values = sheet.getDataRange().getValues();
      if (values[index][0]) {
        return values[index][0].toString();
      }
      return null;
    },
    clear: function() {
      sheet.clear();
      length = 0;
    },
    getLength: function() {
      return length;
    }
  };
})();
