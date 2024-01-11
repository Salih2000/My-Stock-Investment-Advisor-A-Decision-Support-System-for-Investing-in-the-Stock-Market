var lastPrices = {};
var counter = 5;

function startUpdateCycle() {
  updatePrices();
  setInterval(function () {
    counter--;
    $("#counter").text(counter);
    if (counter <= 0) {
      updatePrices();
      counter = 5;
    }
  }, 1000);
}

$(document).ready(function () {
  var tickers = []; // Initialize tickers as an empty array

  tickers.forEach(function (ticker) {
    addTickerToGrid(ticker);
  });

  $("#tickers-grid").on("click", ".remove-btn", function () {
    var tickerToRemove = $(this).data("ticker");

    // Remove the ticker from the tickers list
    tickers = tickers.filter((t) => t !== tickerToRemove);

    // Remove the ticker's data from the lastPrices object
    delete lastPrices[tickerToRemove];

    // Update the localStorage
    localStorage.setItem("tickers", JSON.stringify(tickers));

    // Remove the ticker's HTML element from the grid
    $("#" + tickerToRemove).remove();
  });

  $("#tickers-grid").on("click", ".calculate-btn", function () {
    var ticker = $(this).data("ticker");
    var purchaseDate = $("#" + ticker + "-purchase-date").val();
    var totalInvestment = $("#" + ticker + "-total-investment").val();

    // Fetch data from FastAPI backend
    $.ajax({
      url: "/",
      type: "GET",
      data: {
        ticker: ticker,
        total_amount: totalInvestment,
        purchase_date: purchaseDate,
      },
      success: function (data) {
        // Update the HTML with the received data
        updateHTMLWithData(ticker, data);

        // Expand the stock box
        $("#" + ticker).addClass("expanded");

        // Update the height of other stock boxes to avoid overlapping
        $(".stock-box")
          .not("#" + ticker)
          .removeClass("expanded");

        // Scroll to the expanded stock box
        $("html, body").animate(
          {
            scrollTop: $("#" + ticker).offset().top,
          },
          500
        );
      },
      error: function (xhr, status, error) {
        console.error("Error fetching data:", status, error);
      },
    });
  });

  // Clear tickers from localStorage and navigate to indexcalculator.html when the "Calculate Profit/Loss" button is clicked
  $("#calculate-btn").on("click", function () {
    localStorage.removeItem("tickers");
    window.location.href = "/indexcalculator";
  });

  $("#add-ticker-form").submit(function (e) {
    e.preventDefault();

    // Retrieve form values
    var newTicker = $("#new-ticker").val().toUpperCase();
    var purchaseDate = $("#purchase-date").val();
    var totalInvestment = $("#total-investment").val();

    // Check if the maximum limit is reached
    if (tickers.length >= 2) {
      alert("Sadece 5 Hisse Senedi Ekleyebilirsiniz.");
      return;
    }

    if (!tickers.includes(newTicker)) {
      // Add the new ticker to the tickers list
      tickers.push(newTicker);

      // Add the purchase date and total investment to the data object
      var data = {
        ticker: newTicker,
        purchase_date: purchaseDate,
        total_amount: totalInvestment,
      };

      // Send the data to the backend for calculations
      $.ajax({
        url: "/main",
        type: "GET",
        data: data,
        success: function (data) {
          // Update the HTML with the received data
          updateHTMLWithData(newTicker, data);

          // Expand the stock box
          $("#" + newTicker).addClass("expanded");

          // Update the height of other stock boxes to avoid overlapping
          $(".stock-box")
            .not("#" + newTicker)
            .removeClass("expanded");

          // Scroll to the expanded stock box
          $("html, body").animate(
            {
              scrollTop: $("#" + newTicker).offset().top,
            },
            500
          );

          // Call updateStylingForBiggerValue after updating the HTML
          updateStylingForBiggerValue(tickers[0], tickers[1]);
        },
        error: function (xhr, status, error) {
          console.error(
            "Error fetching data. Status:",
            status,
            "Error:",
            error
          );
        },
      });

      // Add the new ticker to the grid
      addTickerToGrid(newTicker, purchaseDate, totalInvestment);
    } else {
      alert("Stock already added.");
    }

    // Optionally, you may choose to clear form fields after submission
    // $("#new-ticker").val("");
    // $("#purchase-date").val("");
    // $("#total-investment").val("");

    d
  });

  function addTickerToGrid(ticker) {
    $("#" + ticker).append(`<a href="profitloss.html?">View Profit/Loss</a>`);
    $("#tickers-grid").append(
      `<div id="${ticker}" class="stock-box" style="width: 48%; background-color: #f3f3f3;
      border: 1px solid rgba(218, 218, 218, 0.9);border-radius: 25px;">
      <h2>${ticker}</h2>
      <button class="remove-btn" style="background-color: black; border: none; color:white; cursor: pointer; padding: 5px 10px 5px 10px; border-radius: 5px;" data-ticker="${ticker}">Remove</button>

      <div class="information-row">
        <div class="info-container">
        
        <div style="display: flex; gap: 10px; align-items: start; flex-direction:row; ">
          
          <div class="information-table-container" style="width: 35%;">
          <div style="display:flex; align-items:center; width: 110%; justify-content; gap: 5px;">
          <img src="/static/images/stock.svg" style="width: 30px; height:20px;" />
          <h3>Hisse bilgileri</h3>
          </div>
         
         
            <table class="information-table" style="border-radius: 10px;">
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Yatırılan Miktar</td>
                <td id="${ticker}-total-investment-stock"></td>
              </tr>
              <tr>
                <td>Hisse Senedi Adedi</td>
                <td id="${ticker}-number-of-shares"></td>
              </tr>
              <tr>
                <td>Satın Alma Tarihi</td>
                <td id="${ticker}-first-trading-date-stock"></td>
              </tr>
              <tr>
                <td>Satın Alınan Fiyat</td>
                <td id="${ticker}-purchase-price-stock"></td>
              </tr>
              <tr>
                <td>Güncel fiyat</td>
                <td id="${ticker}-current-price-stock"></td>
              </tr>
              <tr>
                <td>Son Fiyat</td>
                <td id="${ticker}-final-value-stock"></td>
              </tr>
              <tr>
                <td>Elde edilen Kar</td>
                <td id="${ticker}-profit-loss-stock"></td>
              </tr>
              
              <tr>
                <td>Hisse Başına Düşen Temettü </td>
                <td id="${ticker}-dividends-received-stock"></td>
              </tr>
            </table>
          </div>
          
          <div class="information-table-container" style="width: 35%;">
          <div style="display:flex; align-items:center; width: 100%; justify-content; gap: 5px;">
          <img src="/static/images/gold.svg" style="width: 25px; height:25px;" />
          <h3>Altın Bilgileri</h3>
          </div>
            <table class="information-table" style="border-radius: 10px;">
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Yatırılan Miktar</td>
                <td id="${ticker}-gold-total-investment"></td>
              </tr>
              <tr>
                <td>Altın Miktarı</td>
                <td id="${ticker}-gold-amount-of-gold"></td>
              </tr>
              <tr>
                <td>Satın Alınan Fiyat</td>
                <td id="${ticker}-gold-purchase-price"></td>
              </tr>
              <tr>
                <td>Güncel Fiyat</td>
                <td id="${ticker}-gold-current-price"></td>
              </tr>
              <tr>
                <td>Elde edilen Kar</td>
                <td id="${ticker}-gold-profit-loss"></td>
              </tr>
              <tr>
                <td>Son Fiyat</td>
                <td id="${ticker}-gold-final-value"></td>
              </tr>
            </table>
          </div>

          <div class="information-table-container" style="width: 35%;">
          <div style="display:flex; align-items:center; width: 100%; justify-content; gap: 5px;">
          <img src="/static/images/usd.svg" style="width: 25px; height:25px;" />
          <h3>Dolar Bilgileri</h3>
          </div>
          
          <table class="information-table" style="border-radius: 10px;">
            <tr>
              <th>Metric</th>
              <th>Value</th>  
            </tr>
            <tr>
              <td>Yatırılan Miktar</td>
              <td id="${ticker}-usd-total-investment"></td>
            </tr>
            <tr>
              <td>USD Miktarı</td>
              <td id="${ticker}-usd-amount-of-usd"></td>
            </tr>
            <tr>
              <td>Satın Alınan Fiyat</td>
              <td id="${ticker}-usd-purchase-price"></td>
            </tr>
            <tr>
              <td>Güncel Fiyat</td>
              <td id="${ticker}-usd-current-price"></td>
            </tr>
            <tr>
              <td>Elde edilen Kar</td>
              <td id="${ticker}-usd-profit-loss"></td>
            </tr>
            <tr>
              <td>Son Fiyat</td>
              <td id="${ticker}-usd-final-value"></td>
            </tr>
          </table>
        </div>
      </div>

        </div>

       

          </div>
      <div class="information-row">
        <div class="info-container">
        <div style="display:flex; align-items:center; width: 100%; justify-content; gap: 5px;">
          <img src="/static/images/euro.svg" style="width: 25px; height:25px;" />
          <h3>Euro Bilgileri</h3>
          </div>
         
          <table class="information-table" style="border-radius: 30px;">
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Yatırılan Miktar</td>
              <td id="${ticker}-euro-total-investment"></td>
            </tr>
            <tr>
              <td>Euro Miktarı</td>
              <td id="${ticker}-euro-amount-of-euro"></td>
            </tr>
            <tr>
              <td>Satın Alınan Fiyat</td>
              <td id="${ticker}-euro-purchase-price"></td>
            </tr>
            <tr>
              <td>Güncel Fiyat</td>
              <td id="${ticker}-euro-current-price"></td>
            </tr>
            <tr>
              <td>Elde Edilen Kar</td>
              <td id="${ticker}-euro-profit-loss"></td>
            </tr>
            <tr>
              <td>Son Fiyat</td>
              <td id="${ticker}-euro-final-value"></td>
            </tr>
          </table>
        </div>

        <div class="info-container">
          <div style="display:flex; align-items:center; width: 100%; justify-content; gap: 5px;">
          <img src="/static/images/pound.svg" style="width: 30px; height:24px;" />
          <h3>Sterlin Bilgileri</h3>
          </div>
          <table class="information-table" style="border-radius: 10px;">
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
            <tr>
              <td>Yatırılan miktar</td>
              <td id="${ticker}-sterling-total-investment"></td>
            </tr>
            <tr>
              <td>Sterlin Miktarı</td>
              <td id="${ticker}-sterling-amount-of-gbp"></td>
            </tr>
            <tr>
              <td>Satın Alınan Fiyat</td>
              <td id="${ticker}-sterling-purchase-price"></td>
            </tr>
            <tr>
              <td>Güncel Fiyat</td>
              <td id="${ticker}-sterling-current-price"></td>
              
            </tr>
            <tr>
              <td>Elde edilen Kar</td>
              <td id="${ticker}-sterling-profit-loss"></td>
            </tr>
            <tr>
            <td>Son Fiyat</td>
            <td id="${ticker}-sterling-final-value"></td>
            </tr>
          </table>
        </div>
      </div>
    </div>`
    );
  }

  function updateHTMLWithData(ticker, data) {
    try {
      if (!data) {
        console.error("Invalid data received:", data);
        return;
      }

      var stockInfo = data.stock_information;
      var goldInfo = data.gold_information;
      var dollarInfo = data.dollar_information;
      var euroInfo = data.euro_information;

      updateStockInformation(ticker, stockInfo);
      updateGoldInformation(ticker, goldInfo);
      updateDollarInformation(ticker, dollarInfo);
      updateEuroInformation(ticker, euroInfo);
    } catch (error) {
      console.error("Error updating HTML with data:", error);
    }
  }

  function updateHTMLWithData(ticker, data) {
    try {
      if (!data) {
        console.error("Invalid data received:", data);
        return;
      }

      var stockInfo = data.stock_information;
      var goldInfo = data.gold_information;
      var dollarInfo = data.dollar_information;
      var euroInfo = data.euro_information;
      var sterlingInfo = data.sterling_information;

      updateStockInformation(ticker, stockInfo);
      updateGoldInformation(ticker, goldInfo);
      updateDollarInformation(ticker, dollarInfo);
      updateEuroInformation(ticker, euroInfo);
      updateSterlingInformation(ticker, sterlingInfo);
    } catch (error) {
      console.error("Error updating HTML with data:", error);
    }
  }

  function formatCurrency(amount, currency) {
    const formatter = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(amount);
  }

  function updateStockInformation(ticker, stockInfo) {
    // Display stock information
    $("#" + ticker + "-total-investment-stock").html(
      "(Hisse)<br>" +
        formatCurrency(stockInfo.total_investment_stock, "TRY")
    );
    $("#" + ticker + "-number-of-shares").html(
      "(Adet)<br>" + stockInfo.number_of_shares.toLocaleString()
    );
    $("#" + ticker + "-purchase-date-stock").html(
      "<br>" + stockInfo.purchase_date_stock
    );
    $("#" + ticker + "-purchase-price-stock").html(
      "<br>" +
        formatCurrency(stockInfo.purchase_price_stock, "TRY")
    );

    // Apply green color to the final value
    $("#" + ticker + "-final-value-stock")
      .html(
        " (Hisse)<br>" +
          formatCurrency(stockInfo.final_value_stock, "TRY")
      )
      .css("color", "green");

    $("#" + ticker + "-profit-loss-stock").html(
      "(Hisse)<br>" +
        formatCurrency(stockInfo.profit_loss_stock, "TRY")
    );

    // Dividends received might be undefined, so use optional chaining (?.)
    var dividendsReceivedStock =
      stockInfo.dividends_received_stock?.toFixed(2) || "N/A";
    $("#" + ticker + "-dividends-received-stock").html(
      "(TRY)<br>" +
        formatCurrency(dividendsReceivedStock, "TRY")
    );
    $("#" + ticker + "-current-price-stock").html(
      "<br>" + formatCurrency(stockInfo.current_price_stock, "TRY")
    );
    $("#" + ticker + "-first-trading-date-stock").html(
      "<br>" + stockInfo.first_trading_date_stock
    );

    // Update dividend information
    // Update dividend information
  }

  function updateGoldInformation(ticker, goldInfo) {
    $("#" + ticker + "-gold-total-investment").html("Altın<br>" + formatCurrency(goldInfo.total_investment_gold_try, "TRY"));
    $("#" + ticker + "-gold-amount-of-gold").html("Gram<br>" + goldInfo.amount_of_gold_grams.toFixed(2) );
    $("#" + ticker + "-gold-purchase-price").html("(1 Gram)<br>" + formatCurrency(goldInfo.purchase_price_gold_try_per_gram, "TRY"));
    $("#" + ticker + "-gold-current-price").html("(1 Gram)<br>" + formatCurrency(goldInfo.current_price_gold_try_per_gram, "TRY"));
    $("#" + ticker + "-gold-final-value").html("(TRY)<br><span style='color: green;'>" + formatCurrency(goldInfo.final_value_gold_try, "TRY") + "</span>");
    $("#" + ticker + "-gold-profit-loss").html("(TRY)<br>" + formatCurrency(goldInfo.gold_profit_loss_try, "TRY"));
    }

    function updateDollarInformation(ticker, dollarInfo) {
    $("#" + ticker + "-usd-total-investment").html(" (TRY)<br>" + formatCurrency(dollarInfo.total_investment_dollar, "TRY"));
    $("#" + ticker + "-usd-amount-of-usd").html("(USD)<br>" + formatCurrency(dollarInfo.amount_of_usd_dollar, "USD"));
    $("#" + ticker + "-usd-purchase-price").html("(USD)<br>" + formatCurrency(dollarInfo.purchase_price_dollar, "USD"));
    $("#" + ticker + "-usd-current-price").html("(USD)<br>" + formatCurrency(dollarInfo.current_price_dollar, "USD"));
    $("#" + ticker + "-usd-final-value").html("(TRY)<br><span style='color: green;'>" + formatCurrency(dollarInfo.final_value_dollar, "TRY") + "</span>");
    $("#" + ticker + "-usd-profit-loss").html("(TRY)<br>" + formatCurrency(dollarInfo.dollar_profit_loss, "TRY"));
    }

    function updateEuroInformation(ticker, euroInfo) {
    $("#" + ticker + "-euro-total-investment").html("(TRY)<br>" + formatCurrency(euroInfo.total_investment_euro, "TRY"));
    $("#" + ticker + "-euro-amount-of-euro").html("(EUR)<br>" + formatCurrency(euroInfo.amount_of_euro, "EUR"));
    $("#" + ticker + "-euro-purchase-price").html("(EUR)<br>" + formatCurrency(euroInfo.purchase_price_euro, "EUR"));
    $("#" + ticker + "-euro-current-price").html("(EUR)<br>" + formatCurrency(euroInfo.current_price_euro, "EUR"));
    $("#" + ticker + "-euro-final-value").html("(TRY)<br><span style='color: green;'>" + formatCurrency(euroInfo.final_value_euro, "TRY") + "</span>");
    $("#" + ticker + "-euro-profit-loss").html("(TRY)<br>" + formatCurrency(euroInfo.euro_profit_loss, "TRY"));
    }

    function updateSterlingInformation(ticker, sterlingInfo) {
    $("#" + ticker + "-sterling-total-investment").html(" (TRY)<br>" + formatCurrency(sterlingInfo.total_investment_sterling, "TRY"));
    $("#" + ticker + "-sterling-amount-of-gbp").html("(GBP)<br>" + formatCurrency(sterlingInfo.amount_of_gbp_sterling, "GBP"));
    $("#" + ticker + "-sterling-purchase-price").html(" (GBP)<br>" + formatCurrency(sterlingInfo.purchase_price_sterling, "GBP"));
    $("#" + ticker + "-sterling-current-price").html("(GBP)<br>" + formatCurrency(sterlingInfo.current_price_sterling, "GBP"));
    $("#" + ticker + "-sterling-profit-loss").html("(TRY)<br>" + formatCurrency(sterlingInfo.gbp_profit_loss_sterling, "TRY"));
    $("#" + ticker + "-sterling-final-value").html("(TRY)<br><span style='color: green;'>" + formatCurrency(sterlingInfo.final_value_sterling, "TRY") + "</span>");
    }

    function updatePrices() {
    console.log("Updating prices...");
    $(".loading-container").show();
    tickers.forEach(function (ticker) {
    console.log("Updating price for", ticker);
    $.ajax({
    url: "/get_stock_data?ticker=" + ticker,
    type: "GET",
    contentType: "application/json; charset=utf-8",
    success: function (data) {
    try {
    if (!tickers.includes(ticker)) {
    console.log("Ticker removed, skipping update for", ticker);
    return;
    }
    if (!data || !data.yfinanceData) {
    console.error("Incomplete or undefined data received for", ticker + ":", data);
    return;
    }
    if (!lastPrices[ticker]) {
    lastPrices[ticker] = {};
    }
    lastPrices[ticker] = {
    final_value_stock: data.yfinanceData.final_value_stock,
    dividends_received_stock: data.yfinanceData.dividends_received_stock,
    };
    console.log("Updated lastPrices for", ticker, lastPrices[ticker]);
    if (data.yfinanceData.currentPrice !== undefined && data.yfinanceData.openPrice !== undefined) {
    var changePercent = ((data.yfinanceData.currentPrice - data.yfinanceData.openPrice) / data.yfinanceData.openPrice) * 100;
    var colorClass;
    if (changePercent <= -2) {
    colorClass = "dark-red";
    } else if (changePercent <= 0) {
    colorClass = "red";
    } else if (changePercent == 0) {
    colorClass = "gray";
    } else if (changePercent <= 2) {
    colorClass = "green";
    } else {
    colorClass = "dark-green";
    }
    $("#" + ticker + "-price").text("₺" + data.yfinanceData.currentPrice.toFixed(2));
    $("#" + ticker + "-pct").text(changePercent.toFixed(2) + "%");
    $("#" + ticker + "-price").removeClass("dark-red red gray green dark-green").addClass(colorClass);
    $("#" + ticker + "-pct").removeClass("dark-red red gray green dark-green").addClass(colorClass);
    } else {
    console.warn("Current price or open price is undefined for", ticker + ". Displaying partial information:", data);
    }
    var flashClass;
    if (lastPrices[ticker] > data.yfinanceData.currentPrice) {
    flashClass = "red-flash";
    } else if (lastPrices[ticker] < data.yfinanceData.currentPrice) {
    flashClass = "green-flash";
    } else {
    flashClass = "gray-flash";
    }
    lastPrices[ticker] = data.yfinanceData.currentPrice;
    $("#" + ticker).addClass(flashClass);
    setTimeout(function () {
    $("#" + ticker).removeClass(flashClass);
    }, 1000);
    } catch (error) {
    console.error("Error updating prices for", ticker + ":", error);
    }
    },
    complete: function () {
    $(".loading-container").hide();
    },
    });
    });
    }

    function handleAjaxError(xhr, status, error, ticker) {
    console.error(`AJAX error for ${ticker}:`, status, error);
    }

    function updateStockPrices() {
    console.log("Updating stock prices...");
    tickers.forEach(function (ticker) {
    $.ajax({
    url: "/get_stock_data?ticker=" + ticker,
    type: "GET",
    contentType: "application/json; charset=utf-8",
    success: function (data) {
    try {
    if (!tickers.includes(ticker) || !data || !data.yfinanceData) {
    console.error(`Invalid data received for ${ticker}:`, data);
    return;
    }
    updateStockInformation(ticker, data.yfinanceData);
    handleStockFlashEffect(ticker, data.yfinanceData);
    } catch (error) {
    console.error(`Error updating stock prices for ${ticker}:`, error);
    }
    },
    error: function (xhr, status, error) {
    handleAjaxError(xhr, status, error, ticker);
    },
    });
    });
    }

    function updateStylingForBiggerValue(ticker1, ticker2) {
    function compareAndUpdate(ticker, value1, value2, elementId) {
    var $element = $("#" + ticker + "-" + elementId);
    console.log("Comparing values for", ticker, value1, value2);
    if (value1 > value2) {
    $element.addClass("bold-text");
    console.log("Adding bold class for", ticker);
    } else {
    $element.removeClass("bold-text");
    console.log("Removing bold class for", ticker);
    }
    }
    var lastPrices1 = lastPrices[ticker1] || {};
    var lastPrices2 = lastPrices[ticker2] || {};
    console.log("Last Prices for", ticker1, lastPrices1);
    console.log("Last Prices for", ticker2, lastPrices2);
    compareAndUpdate(ticker1, lastPrices1.final_value_stock, lastPrices2.final_value_stock, "final-value-stock");
    compareAndUpdate(ticker2, lastPrices2.final_value_stock, lastPrices1.final_value_stock, "final-value-stock");
    compareAndUpdate(ticker1, lastPrices1.dividends_received_stock, lastPrices2.dividends_received_stock, "dividends-received-stock");
    compareAndUpdate(ticker2, lastPrices2.dividends_received_stock, lastPrices1.dividends_received_stock, "dividends-received-stock");
    }
  });
  