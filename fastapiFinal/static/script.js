var lastPrices = {};
var processedTickers = {};

function startUpdateCycle() {
  // You can add any initializations here
}
function addMoreTickers() {
  var newTicker = prompt("Enter a new ticker:");
  if (newTicker) {
    newTicker = newTicker.toUpperCase();
    tickers.push(newTicker);
    localStorage.setItem("tickers", JSON.stringify(tickers));
    addTickerToGrid(newTicker);
    addTicker(newTicker);
  }
}
function compareAndGetBiggerValues(ticker1, ticker2) {
  var table1 = $('#' + ticker1 + '-additional-info');
  var table2 = $('#' + ticker2 + '-additional-info');

  // Check if the tables exist
  if (table1.length === 0 || table2.length === 0) {
    console.error("Table not found for one or both tickers");
    return;
  }

  var table1Rows = $('tbody tr', table1);
  var table2Rows = $('tbody tr', table2);

  // Ensure both tables have the same number of rows
  var numRows = Math.min(table1Rows.length, table2Rows.length);

  for (var index = 0; index < numRows; index++) {
    var value1 = parseFloat($('td:eq(1)', table1Rows.eq(index)).text());
    var value2 = parseFloat($('td:eq(1)', table2Rows.eq(index)).text());

    if (!isNaN(value1) && !isNaN(value2)) {
      if (value1 > value2) {
        $('td:eq(1)', table1Rows.eq(index)).css('font-weight', 'bold');
        $('td:eq(1)', table2Rows.eq(index)).css('font-weight', 'normal');
      } else if (value1 < value2) {
        $('td:eq(1)', table1Rows.eq(index)).css('font-weight', 'normal');
        $('td:eq(1)', table2Rows.eq(index)).css('font-weight', 'bold');
      } else {
        // Both values are equal
        $('td:eq(1)', table1Rows.eq(index)).css('font-weight', 'normal');
        $('td:eq(1)', table2Rows.eq(index)).css('font-weight', 'normal');
      }
    }
  }
}

$(document).ready(function () {
  var lastPrices = {};
  var processedTickers = {};
  var vsDivAdded = false;

  function startUpdateCycle() {
    // You can add any initializations here
  }

  function compareAndGetBiggerValues(ticker1, ticker2) {
    var table1 = $('#' + ticker1 + '-additional-info');
    var table2 = $('#' + ticker2 + '-additional-info');
  
    // Check if the tables exist
    if (table1.length === 0 || table2.length === 0) {
      console.error("Table not found for one or both tickers");
      return;
    }
  
    var table1Rows = $('tbody tr', table1);
    var table2Rows = $('tbody tr', table2);
  
    // Ensure both tables have the same number of rows
    var numRows = Math.min(table1Rows.length, table2Rows.length);
  
    for (var index = 0; index < numRows; index++) {
      var value1 = parseFloat($('td:eq(1)', table1Rows.eq(index)).text());
      var value2 = parseFloat($('td:eq(1)', table2Rows.eq(index)).text());
  
      if (!isNaN(value1) && !isNaN(value2)) {
        if (value1 > value2) {
          $('td:eq(1)', table1Rows.eq(index)).addClass('bold-value');
          $('td:eq(1)', table2Rows.eq(index)).removeClass('bold-value');
        } else if (value1 < value2) {
          $('td:eq(1)', table1Rows.eq(index)).removeClass('bold-value');
          $('td:eq(1)', table2Rows.eq(index)).addClass('bold-value');
        } else {
          // Both values are equal
          $('td:eq(1)', table1Rows.eq(index)).removeClass('bold-value');
          $('td:eq(1)', table2Rows.eq(index)).removeClass('bold-value');
        }
      }
    }
  }
  

  // Create the vsImage element once when the page is loaded
  var vsImage = $("<img src='/static/images/vs_png.png' />").css({
    "height": "100px",
    "width": "150px",
  });

  var tickers = [];

  tickers.forEach(function (ticker) {
    addTickerToGrid(ticker);
    updatePricesForTicker(ticker);
  });

  $("#tickers-grid").on("click", ".remove-btn", function () {
    var tickerToRemove = $(this).data("ticker");
    tickers = tickers.filter((t) => t !== tickerToRemove);
    localStorage.setItem("tickers", JSON.stringify(tickers));
    $("#" + tickerToRemove).remove();

    delete processedTickers[tickerToRemove];

    if (Object.keys(processedTickers).length === 1 && vsDivAdded) {
      $(".vs-title").remove();
      vsDivAdded = false;
    }

    if (Object.keys(processedTickers).length === 2) {
      var tickersArray = Object.keys(processedTickers);
      compareAndGetBiggerValues(tickersArray[0], tickersArray[1]);
    }
  });

  $("#add-ticker-form").submit(function (e) {
    e.preventDefault();
    var newTicker = $("#new-ticker").val().toUpperCase();

    if (tickers.length >= 4) {
      alert("Sadece 4 adet Hisse Senedi ekleyebilirsiniz.");
      return;
    }

    if (!tickers.includes(newTicker) && !processedTickers[newTicker]) {
      tickers.push(newTicker);
      localStorage.setItem("tickers", JSON.stringify(tickers));
      addTickerToGrid(newTicker);
      updatePricesForTicker(newTicker);
      processedTickers[newTicker] = true;

      
      
      if (tickers.length === 2 && !vsDivAdded) {
        var vsDiv = $("<div class='vs-title'></div>").css({
          "height": "700px",
          "display": "flex",
          "align-items": "center",
          "justify-content": "center"
        }).append(vsImage.clone());

        $(".stock-box").each(function (index) {
          if (index > 0) {
            $(this).before(vsDiv.clone());
          }
        });

        vsDivAdded = true;
      }

      if (Object.keys(processedTickers).length === 2) {
        var tickersArray = Object.keys(processedTickers);
        compareAndGetBiggerValues(tickersArray[0], tickersArray[1]);
      }
    }
    $("#new-ticker").val("");
    
  });


  function addTickerToGrid(ticker) {
    $.ajax({
      url: "/get_stock_data?ticker=" + ticker + "&interval=1d",
      type: "GET",
      contentType: "application/json; charset=utf-8",
      success: function (data) {
        try {
          $("#" + ticker + "-price").text("₺" + data.yfinanceData.currentPrice.toFixed(2));
  
          var changePercent = ((data.yfinanceData.currentPrice - data.yfinanceData.openPrice) /
            data.yfinanceData.openPrice) * 100;
  
          $("#" + ticker + "-pct").text(changePercent.toFixed(2) + "%");
  
          if (changePercent < 0) {
            $("#" + ticker + "-pct").css("color", "red");
          } else {
            $("#" + ticker + "-pct").css("color", "green");
          }
  
          if (data) {
            processedTickers[ticker] = data;
  
            if (Object.keys(processedTickers).length === 2) {
              var tickersArray = Object.keys(processedTickers);
              compareAndGetBiggerValues(tickersArray[0], tickersArray[1]);
            }
          }
        } catch (error) {
          console.error("Error processing data for ticker:", ticker, error);
        }
      },
      error: function (xhr, status, error) {
        console.error("Error fetching data for ticker:", ticker, status, error);
      },
    });
  
    var vsImage = $("<img src='/static/images/vs_png.png' />").css({
      "height": "100px",
      "width": "150px",
    });
  
    $("#tickers-grid").append(
      `<div id="${ticker}" class="stock-box" style=" background-color: rgb(235, 248, 255); border: none; box-shadow: none; border-radius:none; height: 850px;">
        
        <div style="display:flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display:flex; align-items: center; gap: 10px;">
        <h2>${ticker}</h2>
        <p id="${ticker}-pct" style="font-size: 20px; color: green; margin-top: 25px"></p>
        </div>
        
        <p id="${ticker}-price" style="font-size: 20px; color: black;"></p>
        </div>
        <div class="loading-spinner" id="${ticker}-loading-spinner"></div>
        <p id="${ticker}-loading-message">Oranlar Geliyor.....</p>
        
        <table id="${ticker}-additional-info" style="width: 100%;  solid black; font-size: 18px;">
      </table>
      <div id="${ticker}-getiri-info"></div>
        <button class="remove-btn" data-ticker="${ticker}" style="background-color: black; color: white; padding: 5px;">Kaldır</button>
    </div>`);
  
    if (Object.keys(processedTickers).length > 1) {
      var vsDiv = $("<div class='vs-title'></div>").css({
        "height": "700px",
        "display": "flex",
        "align-items": "center",
        "justify-content": "center"
      }).append(vsImage.clone());
  
      $("#" + ticker).before(vsDiv.clone());
    } else if (Object.keys(processedTickers).length === 1 && !vsDivAdded) {
      var vsDiv = $("<div class='vs-title'></div>").css({
        "height": "700px",
        "display": "flex",
        "align-items": "center",
        "justify-content": "center"
      }).append(vsImage.clone());
  
      $(".stock-box").each(function (index) {
        if (index > 0) {
          $(this).before(vsDiv.clone());
        }
      });
  
      vsDivAdded = true;
    }
  }
  
  function removeTicker(tickerToRemove) {
    tickers = tickers.filter((t) => t !== tickerToRemove);
    localStorage.setItem("tickers", JSON.stringify(tickers));
    $("#" + tickerToRemove).remove();
  
    delete processedTickers[tickerToRemove];
  
    if (Object.keys(processedTickers).length === 1 && vsDivAdded) {
      $(".vs-title").remove();
      vsDivAdded = false;
    }
  
    if (Object.keys(processedTickers).length === 2) {
      var tickersArray = Object.keys(processedTickers);
      compareAndGetBiggerValues(tickersArray[0], tickersArray[1]);
    }
  }
  

  
  function updatePricesForTicker(ticker) {
    var tickerLoadingSpinner = $("#" + ticker + "-loading-spinner");
    var tickerLoadingMessage = $("#" + ticker + "-loading-message");
    var tickerPrice = $("#" + ticker + "-price");
    var tickerPct = $("#" + ticker + "-pct");
    var tickerAdditionalInfo = $("#" + ticker + "-additional-info");
    var tickerGetiriInfo = $("#" + ticker + "-getiri-info");
  
    tickerLoadingSpinner.show();
  
    // Dynamic loading messages
    var loadingMessages = [
      "Ocak 2024'de Borsa İstanbul da yatırımcı Sayısı 10 Milyonu Geçti!",
      "Yatırım Tavsiyesi değildir (YTD)....",
      "Borsa İstanbul, BIST 500 Endeksi'nin hesaplanmaya başladığını açıkladı.",
      "2023'te 54 şirket halka arz oldu",
      "Türkiye’nin yaklaşık 10’da biri borsa yatırımcısı",
      "Veriler İşleniyor...",
      "Borsa İstanbul'da 10 milyon ve üzeri portföy sahibi 15 bin 371 kişi, piyasanın yüzde 80'ine sahip. Yatırımcıların yüzde 56'sının portföyü ise 10 bin liranın altında."
    ];
  
    var messageIndex = 0;
  
    function updateLoadingMessage() {
      var randomIndex = Math.floor(Math.random() * loadingMessages.length);
      tickerLoadingMessage.text(loadingMessages[randomIndex]);
    }
  
    // Set an interval to update loading messages every 5 seconds
    var loadingMessageInterval = setInterval(updateLoadingMessage, 5000);
  
    // Clear the loading message interval after a certain time (e.g., 30 seconds)
    setTimeout(function () {
        clearInterval(loadingMessageInterval);
    }, 50000); // 30 seconds


    $.ajax({
      url: "/get_stock_data?ticker=" + ticker + "&interval=1d",
      type: "GET",
      contentType: "application/json; charset=utf-8",
      success: function (data) {
        try {
          if (
            !data ||
            !data.yfinanceData ||
            !data.yfinanceData.currentPrice ||
            !data.yfinanceData.openPrice
          ) {
            console.error("Incomplete or undefined data received:", data);
            handleDataError(ticker);
            clearInterval(loadingMessageInterval);
            return;
          }

          var changePercent =
            ((data.yfinanceData.currentPrice - data.yfinanceData.openPrice) /
              data.yfinanceData.openPrice) *
            100;
          var colorClass = getColorClass(changePercent);

          tickerPrice.text("₺" + data.yfinanceData.currentPrice.toFixed(2));
          tickerPct.text(changePercent.toFixed(2) + "%");
          tickerPrice
            .removeClass("dark-red red gray green dark-green")
            .addClass(colorClass);
          tickerPct
            .removeClass("dark-red red gray green dark-green")
            .addClass(colorClass);

          var additionalInfo = Object.entries(data.webscrapingData)
            .map(
              ([key, value]) => `
      <tr>
        <td style="border: 3px solid black; padding: 5px 10px;">${key}</td>
        <td style="border: 3px solid black; padding: 5px 10px; font-weight: bold;">${value}</td>
      </tr>
    `
            )
            .join("");

          tickerAdditionalInfo.html(additionalInfo);

          var additionalGetiriInfo = data.getiriData || [];

          var getiriInfoHtml = `
        <div class="box-title">
            <h3>Getiriler</h3>
        </div>
        <div class="box-content">
            <div class="table-wrap">
                <table id="${ticker}-getiri-table" class="rounded-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>1 Gün (%)</th>
                            <th>1 Hafta (%)</th>
                            <th>1 Ay (%)</th>
                            <th>Yıl İçi Getiri (%) </th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    additionalGetiriInfo.forEach((info) => {
        getiriInfoHtml += `
            <tr>
                <td>${info.Birim}</td>
                <td>${info["Günlük(%)"]}</td>
                <td>${info["Haftalık(%)"]}</td>
                <td>${info["Aylık(%)"]}</td>
                <td>${info["Yıl içi getiri(%)"]}</td>
            </tr>
        `;
    });

    getiriInfoHtml += `
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;

    tickerGetiriInfo.html(getiriInfoHtml);

    // Initialize DataTable for better styling and features
    $(`#${ticker}-getiri-table`).DataTable({
        paging: false, // Disable pagination
        searching: false, // Disable search bar
        info: false, // Disable info text
        columnDefs: [
            { className: 'dt-center', targets: '_all' }, // Center align text
        ],
    });

          var flashClass = getFlashClass(ticker, data.yfinanceData.currentPrice);
          $("#" + ticker).addClass(flashClass);
          setTimeout(function () {
            $("#" + ticker).removeClass(flashClass);
          }, 1000);

          setTimeout(function () {
            if (Object.keys(processedTickers).length === 2) {
              var tickersArray = Object.keys(processedTickers);
              compareAndGetBiggerValues(tickersArray[0], tickersArray[1]);
            }
          }, 15000);
        } catch (error) {
          console.error("Error updating prices:", error);
          handleDataError(ticker);
        } finally {
          tickerLoadingSpinner.hide();
          tickerLoadingMessage.text("");
          tickerLoadingMessage.remove();
        }
      },

      error: function (xhr, status, error) {
        console.error("AJAX error:", status, error);
        handleDataError(ticker);
      },
    });
  }

  function getColorClass(changePercent) {
    if (changePercent <= -2) {
      return "dark-red";
    } else if (changePercent <= 0) {
      return "red";
    } else if (changePercent == 0) {
      return "gray";
    } else if (changePercent <= 2) {
      return "green";
    } else {
      return "dark-green";
    }
  }

  function getFlashClass(ticker, currentPrice) {
    var flashClass;
    if (lastPrices[ticker] > currentPrice) {
      flashClass = "red-flash";
    } else if (lastPrices[ticker] < currentPrice) {
      flashClass = "green-flash";
    } else {
      flashClass = "gray-flash";
    }
    lastPrices[ticker] = currentPrice;
    return flashClass;
  }

  function handleDataError(ticker) {
    $("#" + ticker + "-loading-spinner").hide();
    $("#" + ticker + "-loading-message").text("Error loading data");
  }
});

