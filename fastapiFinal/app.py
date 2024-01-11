from datetime import datetime
import logging
import yfinance as yf
import requests
from bs4 import BeautifulSoup
import json
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi import Depends, File, UploadFile
from fastapi.responses import StreamingResponse

templates = Jinja2Templates(directory='templates')

app = FastAPI(template_folder='templates')
app.mount("/static", StaticFiles(directory="static"), "static")

@app.get('/',tags=["View"])
async def index(request: Request):
    return templates.TemplateResponse('index.html', context={'request': request})

@app.get('/indexcalculator')  
async def index_calculator(request: Request):
    return templates.TemplateResponse('indexcalculator.html', context={'request': request})



@app.get('/indexcsv', response_class=HTMLResponse)
async def index_csv(request: Request):
    excel_path = 'uploads/stockdividends.xlsx'
    
    try:
        data = pd.read_excel(excel_path)
    except Exception as e:
        return {"error": f"Error reading Excel file: {str(e)}"}

    return templates.TemplateResponse('indexcsv.html', {'request': request, 'excel_data': data.to_html()})

@app.get('/get_stock_data')
async def get_stock_data(ticker: str, request: Request, response: Response):


    ticker = ticker.upper() + ".IS"

    yfinance_data = yf.Ticker(ticker).history(period="1y")
    yfinance_data = json.loads(yfinance_data.to_json())

    open_price_yfinance = list(yfinance_data["Open"].values())[-1]
    close_price_yfinance = list(yfinance_data["Close"].values())[-1]

    sirket = ticker[:-3] if ticker.endswith(".IS") else ticker
    url = "https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse={}".format(sirket)
    parser = BeautifulSoup(requests.get(url).content, "html.parser")
    carideger = parser.find("div", {"id": "ctl00_ctl58_g_76ae4504_9743_4791_98df_dce2ca95cc0d"}).find_all("tr")

    stock_info = {}
    for i in carideger:
        bilgi1 = i.th.string
        bilgi2 = i.td.string
        stock_info[bilgi1] = bilgi2

 
    response_data = {
        "yfinanceData": {"currentPrice": close_price_yfinance, "openPrice": open_price_yfinance},
        "webscrapingData": stock_info
    }
    
    getiri_info = getiri(ticker[:-3])  
    
    response_data = {
        "yfinanceData": {"currentPrice": close_price_yfinance, "openPrice": open_price_yfinance},
        "webscrapingData": stock_info,
        "getiriData": getiri_info  
    }

    return response_data


def getiri(company_name: str):
    try:
        url = "https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse={}".format(
            company_name
        )

        parser = BeautifulSoup(requests.get(url).content, "html.parser")

        getiri_data = parser.find("div", {"id": "ctl00_ctl58_g_aa8fd74f_f3b0_41b2_9767_ea6f3a837982"}).find("table") \
            .find("tbody").find_all("tr")

        getiri_info = []
        for i in getiri_data:
            bilgi = i.find_all("td")
            getiri_info.append({
                "Birim": bilgi[0].string,
                "Günlük(%)": bilgi[1].string,
                "Haftalık(%)": bilgi[2].string,
                "Aylık(%)": bilgi[3].string,
                "Yıl içi getiri(%)": bilgi[4].string
            })

        return getiri_info
    except Exception as e:
        print(f"Error retrieving getiri information: {e}")
        return []

@app.get('/calculate_profit_loss') 
async def calculate_profit_loss(request: Request):
    return templates.TemplateResponse('indexcalculator.html', context={'request': request})


@app.get('/indexcalculator')
async def index_calculator(request: Request):
    return templates.TemplateResponse('indexcalculator.html', context={'request': request})



@app.get('/get_stock_data')
async def get_stock_data(ticker: str, request: Request, response: Response):
    ticker = ticker.upper() + ".IS"
    data = yf.Ticker(ticker).history(period="1y")
    data = json.loads(data.to_json())
    open_price = list(data["Open"].values())[-1]
    close_price = list(data["Close"].values())[-1]
    return {"currentPrice": close_price, "openPrice": open_price}


@app.get('/calculate_profit_loss_for_ticker')
async def calculate_profit_loss_for_ticker(ticker: str, total_amount: float, purchase_date: str):
    try:
        ticker = ticker.upper() + ".IS"
        stock_data = yf.download(ticker, start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        first_trading_date = stock_data.index[0].strftime('%Y-%m-%d')
        dividends = yf.Ticker(ticker).dividends
        stock_data = stock_data.tz_localize(None)
        dividends = dividends.tz_localize(None)
        merged_data = stock_data.merge(dividends, how='left', left_index=True, right_index=True)
        closing_prices = merged_data['Close']
        purchase_price = closing_prices.iloc[0]
        shares = total_amount / purchase_price
        total_investment = total_amount
        final_value = shares * closing_prices.iloc[-1]
        profit_loss = final_value - total_investment

        if 'Dividends' in merged_data.columns: 
            dividend_data = merged_data[['Dividends']].dropna()
            dividends_received = dividend_data['Dividends'].sum()
            profit_loss += dividends_received
        else:
            dividends_received = 0
            dividend_data = pd.DataFrame()

        purchase_price = closing_prices.iloc[0]
        current_stock = yf.Ticker(ticker)
        current_price = current_stock.history(period='1d')['Close'].iloc[-1]

        return {
            'total_investment': total_investment,
            'dividends_received': dividends_received,
            'purchase_price': purchase_price,
            'current_price': current_price,
            'profit_loss': profit_loss,
            'final_value': final_value,
            'shares': shares,
            'dividend_data': dividend_data,
            'first_trading_date': first_trading_date
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_profit_loss_for_ticker:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_dollar_profit_loss')
async def calculate_dollar_profit_loss(total_amount: float, purchase_date: str):
    try:
        usd_try_data = yf.download('USDTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        usd_try_prices = usd_try_data['Close']
        usd_data = yf.download('USDTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        closing_prices = usd_data['Close']
        purchase_price = closing_prices.iloc[0]
        amount_of_usd = total_amount / purchase_price
        total_investment = total_amount
        final_value = amount_of_usd * usd_try_prices.iloc[-1]
        dollar_profit_loss = final_value - total_investment

        return {
            'total_investment': total_investment,
            'purchase_price': purchase_price,
            'current_price': usd_try_prices.iloc[-1],
            'dollar_profit_loss': dollar_profit_loss,
            'final_value': final_value,
            'amount_of_usd': amount_of_usd
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_dollar_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_euro_profit_loss')
async def calculate_euro_profit_loss(total_amount: float, purchase_date: str):
    try:
        euro_try_data = yf.download('EURTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        euro_try_prices = euro_try_data['Close']
        euro_data = yf.download('EURTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        closing_prices = euro_data['Close']
        purchase_price = closing_prices.iloc[0]
        amount_of_euro = total_amount / purchase_price
        total_investment = total_amount
        final_value = amount_of_euro * euro_try_prices.iloc[-1]
        euro_profit_loss = final_value - total_investment

        return {
            'total_investment': total_investment,
            'purchase_price': purchase_price,
            'current_price': euro_try_prices.iloc[-1],
            'euro_profit_loss': euro_profit_loss,
            'final_value': final_value,
            'amount_of_euro': amount_of_euro
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_euro_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_sterling_profit_loss')
async def calculate_sterling_profit_loss(total_amount: float, purchase_date: str):
    try:
        gbp_try_data = yf.download('GBPTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        gbp_try_prices = gbp_try_data['Close']
        gbp_data = yf.download('GBPTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        closing_prices = gbp_data['Close']
        purchase_price = closing_prices.iloc[0]
        amount_of_gbp = total_amount / purchase_price
        total_investment = total_amount
        final_value = amount_of_gbp * gbp_try_prices.iloc[-1]
        gbp_profit_loss = final_value - total_investment

        return {
            'total_investment': total_investment,
            'purchase_price': purchase_price,
            'current_price': gbp_try_prices.iloc[-1],
            'gbp_profit_loss': gbp_profit_loss,
            'final_value': final_value,
            'amount_of_gbp': amount_of_gbp
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_sterling_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_gold_profit_loss')
async def calculate_gold_profit_loss(total_amount: float, purchase_date: str):
    try:
        usd_try_data = yf.download('USDTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        usd_try_prices = usd_try_data['Close']
        purchase_price_usd = usd_try_prices.iloc[0]
        amount_of_usd = total_amount / purchase_price_usd
        gold_data = yf.download('GC=F', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        gold_prices_usd = gold_data['Close']
        purchase_price_gold_usd_per_ounce = gold_prices_usd.iloc[0]
        amount_of_gold_grams = amount_of_usd / purchase_price_gold_usd_per_ounce * 31.1034768
        total_investment = total_amount
        final_value_gold_usd = amount_of_gold_grams * gold_prices_usd.iloc[-1]
        gold_profit_loss_usd = final_value_gold_usd - total_investment
        gold_profit_loss_try = gold_profit_loss_usd * usd_try_prices.iloc[-1]
        current_price_gold_try_per_gram = gold_prices_usd.iloc[-1] * usd_try_prices.iloc[-1] / 31.1034768
        profit_loss_try = (amount_of_gold_grams * current_price_gold_try_per_gram) - total_amount

        return {
            'total_investment_gold_try': total_amount,
            'amount_of_gold_grams': amount_of_gold_grams,
            'purchase_price_gold_try_per_gram': total_amount / amount_of_gold_grams,
            'final_value_gold_try': amount_of_gold_grams * current_price_gold_try_per_gram,
            'gold_profit_loss_try': profit_loss_try,
            'current_price_gold_try_per_gram': current_price_gold_try_per_gram
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_gold_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_profit_loss_on_add')
async def calculate_profit_loss_on_add(ticker: str, total_amount: float, purchase_date: str):
    result = await calculate_profit_loss_for_ticker(ticker, total_amount, purchase_date)
    return result


@app.get('/calculate_dollar_profit_loss')
async def calculate_dollar_profit_loss(total_amount: float, purchase_date: str):
    try:
        usd_try_data = yf.download('USDTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        usd_try_prices = usd_try_data['Close']
        usd_data = yf.download('USDTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        closing_prices = usd_data['Close']
        purchase_price = closing_prices.iloc[0]
        amount_of_usd = total_amount / purchase_price
        total_investment = total_amount
        final_value = amount_of_usd * usd_try_prices.iloc[-1]
        dollar_profit_loss = final_value - total_investment

        return {
            'total_investment': total_investment,
            'purchase_price': purchase_price,
            'current_price': usd_try_prices.iloc[-1],
            'dollar_profit_loss': dollar_profit_loss,
            'final_value': final_value,
            'amount_of_usd': amount_of_usd
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_dollar_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_euro_profit_loss')
async def calculate_euro_profit_loss(total_amount: float, purchase_date: str):
    try:
        euro_try_data = yf.download('EURTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        euro_try_prices = euro_try_data['Close']
        euro_data = yf.download('EURTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        closing_prices = euro_data['Close']
        purchase_price = closing_prices.iloc[0]
        amount_of_euro = total_amount / purchase_price
        total_investment = total_amount
        final_value = amount_of_euro * euro_try_prices.iloc[-1]
        euro_profit_loss = final_value - total_investment

        return {
            'total_investment': total_investment,
            'purchase_price': purchase_price,
            'current_price': euro_try_prices.iloc[-1],
            'euro_profit_loss': euro_profit_loss,
            'final_value': final_value,
            'amount_of_euro': amount_of_euro
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_euro_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_sterling_profit_loss')
async def calculate_sterling_profit_loss(total_amount: float, purchase_date: str):
    try:
        gbp_try_data = yf.download('GBPTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        gbp_try_prices = gbp_try_data['Close']
        gbp_data = yf.download('GBPTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        closing_prices = gbp_data['Close']
        purchase_price = closing_prices.iloc[0]
        amount_of_gbp = total_amount / purchase_price
        total_investment = total_amount
        final_value = amount_of_gbp * gbp_try_prices.iloc[-1]
        gbp_profit_loss = final_value - total_investment

        return {
            'total_investment': total_investment,
            'purchase_price': purchase_price,
            'current_price': gbp_try_prices.iloc[-1],
            'gbp_profit_loss': gbp_profit_loss,
            'final_value': final_value,
            'amount_of_gbp': amount_of_gbp
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_sterling_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/calculate_gold_profit_loss')
async def calculate_gold_profit_loss(total_amount: float, purchase_date: str):
    try:
        usd_try_data = yf.download('USDTRY=X', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        usd_try_prices = usd_try_data['Close']
        purchase_price_usd = usd_try_prices.iloc[0]
        amount_of_usd = total_amount / purchase_price_usd
        gold_data = yf.download('GC=F', start=purchase_date, end=datetime.today().strftime('%Y-%m-%d'))
        gold_prices_usd = gold_data['Close']
        purchase_price_gold_usd_per_ounce = gold_prices_usd.iloc[0]
        amount_of_gold_grams = amount_of_usd / purchase_price_gold_usd_per_ounce * 31.1034768
        total_investment = total_amount
        final_value_gold_usd = amount_of_gold_grams * gold_prices_usd.iloc[-1]
        gold_profit_loss_usd = final_value_gold_usd - total_investment
        gold_profit_loss_try = gold_profit_loss_usd * usd_try_prices.iloc[-1]
        current_price_gold_try_per_gram = gold_prices_usd.iloc[-1] * usd_try_prices.iloc[-1] / 31.1034768
        profit_loss_try = (amount_of_gold_grams * current_price_gold_try_per_gram) - total_amount

        return {
            'total_investment_gold_try': total_amount,
            'amount_of_gold_grams': amount_of_gold_grams,
            'purchase_price_gold_try_per_gram': total_amount / amount_of_gold_grams,
            'final_value_gold_try': amount_of_gold_grams * current_price_gold_try_per_gram,
            'gold_profit_loss_try': profit_loss_try,
            'current_price_gold_try_per_gram': current_price_gold_try_per_gram
        }
    except Exception as e:
        logging.exception("An error occurred in calculate_gold_profit_loss:")
        return {"error": "Internal Server Error"}


@app.get('/main')
async def main(ticker: str, total_amount: float, purchase_date: str):
    try:
       
        result_stock = await calculate_profit_loss_for_ticker(ticker, total_amount, purchase_date)

        if "error" in result_stock:
           
            raise HTTPException(status_code=500, detail=result_stock["error"])

        print("Result Stock:", result_stock)  

        stock_info = {
            'ticker_symbol': ticker,
            'total_investment_stock': result_stock['total_investment'],
            'number_of_shares': result_stock['shares'],
            'purchase_date_stock': purchase_date,
            'purchase_price_stock': result_stock['purchase_price'],
            'final_value_stock': result_stock['final_value'],
            'profit_loss_stock': result_stock['profit_loss'],
            'dividend_data': result_stock['dividend_data'],  
            'dividends_received_stock': result_stock['dividends_received'],
            'current_price_stock': result_stock['current_price'],
            'first_trading_date_stock': result_stock['first_trading_date']
        }

        result_gold = await calculate_gold_profit_loss(total_amount, purchase_date)

        if "error" in result_gold:
       
            raise HTTPException(status_code=500, detail=result_gold["error"])

        print("Result Gold:", result_gold)  

        gold_info = {
            'total_investment_gold_try': result_gold['total_investment_gold_try'],
            'amount_of_gold_grams': result_gold['amount_of_gold_grams'],
            'purchase_price_gold_try_per_gram': result_gold['purchase_price_gold_try_per_gram'],
            'final_value_gold_try': result_gold['final_value_gold_try'],
            'gold_profit_loss_try': result_gold['gold_profit_loss_try'],
            'current_price_gold_try_per_gram': result_gold['current_price_gold_try_per_gram']
        }

        result_dollar = await calculate_dollar_profit_loss(total_amount, purchase_date)

        if "error" in result_dollar:
           
            raise HTTPException(status_code=500, detail=result_dollar["error"])

        print("Result Dollar:", result_dollar)  # Log the result_dollar for debugging

        dollar_info = {
            'total_investment_dollar': result_dollar['total_investment'],
            'amount_of_usd_dollar': result_dollar['amount_of_usd'],
            'purchase_price_dollar': result_dollar['purchase_price'],
            'final_value_dollar': result_dollar['final_value'],
            'dollar_profit_loss': result_dollar['dollar_profit_loss'],
            'current_price_dollar': result_dollar['current_price']
        }

        result_euro = await calculate_euro_profit_loss(total_amount, purchase_date)

        if "error" in result_euro:
           
            raise HTTPException(status_code=500, detail=result_euro["error"])

        print("Result Euro:", result_euro)  

        euro_info = {
            'total_investment_euro': result_euro['total_investment'],
            'amount_of_euro': result_euro['amount_of_euro'],
            'purchase_price_euro': result_euro['purchase_price'],
            'current_price_euro': result_euro['current_price'],
            'euro_profit_loss': result_euro['euro_profit_loss'],
            'final_value_euro': result_euro['final_value']
        }

        result_sterling = await calculate_sterling_profit_loss(total_amount, purchase_date)

        if "error" in result_sterling:
           
            raise HTTPException(status_code=500, detail=result_sterling["error"])

        print("Result Sterling:", result_sterling) 

        sterling_info = {
            'total_investment_sterling': result_sterling['total_investment'],
            'amount_of_gbp_sterling': result_sterling['amount_of_gbp'],
            'purchase_price_sterling': result_sterling['purchase_price'],
            'final_value_sterling': result_sterling['final_value'],
            'gbp_profit_loss_sterling': result_sterling['gbp_profit_loss'],
            'current_price_sterling': result_sterling['current_price']
        }

        return {
            'stock_information': stock_info,
            'gold_information': gold_info,
            'dollar_information': dollar_info,
            'euro_information': euro_info,
            'sterling_information': sterling_info
        }
    except HTTPException:
        
        raise
    except Exception as e:
        logging.exception("An error occurred in main:")
        return {"error": "Internal Server Error"}
