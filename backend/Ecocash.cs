using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Json;
using System.Xml.Serialization;
using Microsoft.Extensions.Primitives;
using MudBlazor;

public class EcocashClient
{
    public string apiKey {get; set;}
    public string baseUrl {get; set;} = "https://developers.ecocash.co.zw/api/ecocash_pay/";
    public string mode {get; set;}
    HttpClient httpClient = new HttpClient();

    public EcocashClient(string apiKey, string mode = "sandbox")
    {
        this.apiKey = apiKey;
        this.mode = mode;
    }

    private void SetHeaders()
    {
        httpClient.DefaultRequestHeaders.Add("Content-Type", "application/json");
        httpClient.DefaultRequestHeaders.Add("X-API-KEY", this.apiKey);
    }

    public async Task<InitPaymentResponse> InitPayment(string phone, float amount, string reason) {
        SetHeaders();
        var reference = Guid.NewGuid();

        var url = $"{this.baseUrl}api/v2/payment/instant/c2b/${this.mode}";

        var body = new {
            customerMsisdn = phone,
            phone = phone,
            amount = amount,
            reason = reason,
            currency = "USD",  
            sourceReference = reference
        };

        var response = await httpClient.PostAsync(url, new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));

        return await response.Content.ReadFromJsonAsync<InitPaymentResponse>();
    }

    public async Task<RefundResponse> RefundPayment(RefundDetails details) {
        SetHeaders();
        var url = $"{this.baseUrl}/api/v2/refund/instant/c2b/${this.mode}";

        var body = new {
            origionalEcocashTransactionReference = details.reference,
            refundCorelator = "012345l61975",
            sourceMobileNumber = details.phone,
            amount = details.amount,
            clientName = details.clientName,
            currency = details.currency ?? "USD",
            reasonForRefund = details.reason,
        };

        var response = await httpClient.PostAsync(url, new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));
        return await response.Content.ReadFromJsonAsync<RefundResponse>();
    }

    public async Task<LookupTransactionResponse> LookupTransaction(string reference, string phone) {
        SetHeaders();
        var url = $"{this.baseUrl}/api/v1/transaction/c2b/status/${this.mode}";

        var body = new {
            sourceMobileNumber = phone,
            sourceReference = reference
        };

        var response = await httpClient.PostAsync(url, new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));

        return await response.Content.ReadFromJsonAsync<LookupTransactionResponse>();
    }

    public async Task<LookupTransactionResponse> PollTransaction(InitPaymentResponse response, PollStrategies strategy = PollStrategies.Interval, PollOptions? options = null) {      
      SetHeaders();
      var multiplier = options?.multiplier ?? 2;
      var sleep = options?.sleep ?? 1000;
      var interval = options?.interval ?? 10.0f;

      LookupTransactionResponse lookupResponse = await LookupTransaction(response.sourceReference, response.phone);
      lookupResponse.paymentSuccess = lookupResponse.status == "SUCCESS";

      switch (strategy)
        {
            case PollStrategies.Interval:
                for (var i = 0; i < interval; i++) {
                    lookupResponse = await LookupTransaction(response.sourceReference, response.phone);

                    if(lookupResponse.paymentSuccess) return lookupResponse;
                    Thread.Sleep(sleep);
                }
                break;
            case PollStrategies.Backoff:
                for (var i = 0; i < interval; i++) {
                    lookupResponse = await LookupTransaction(response.sourceReference, response.phone);

                    if(lookupResponse.paymentSuccess) return lookupResponse;

                    Thread.Sleep(sleep);
                    sleep *= multiplier;
                }
                break;
            case PollStrategies.Simple:
                for (var i = 0; i < interval; i++) {
                    lookupResponse = await LookupTransaction(response.sourceReference, response.phone);

                    if(lookupResponse.paymentSuccess) return lookupResponse;
                }
                break;
        }

        return lookupResponse;
    }
}

public class PollOptions {
    public int? multiplier {get; set;}
    public int? sleep {get; set;}
    public float? interval {get; set;}
}

public enum PollStrategies
{
    Interval,
    Backoff,
    Simple,
}

public class RefundDetails {
    public string reference {get; set;}
    public string phone {get; set;}
    public float amount {get; set;}
    public string clientName {get; set;}
    public string reason {get; set;}
    public string? currency {get; set;}
}

public class InitPaymentResponse {
    public string phone {get; set;}
    public float amount {get; set;}
    public string reason {get; set;}
    public string? currency {get; set;}
    public string sourceReference {get; set;}
}

public class TransactionAmount {
    public float amount {get; set;}
    public string currency {get; set;}
}

public class LookupTransactionResponse {
    public TransactionAmount amount {get; set;}
    public string customerMsisdn {get; set;}
    public string reference {get; set;}
    public string ecocashReference {get; set;}
    public bool paymentSuccess {get; set;}
    public string status {get; set;}
    public string transactionDateTime {get; set;}
}

public class RefundResponse {
    public string sourceReference {get; set;}
    public string transactionEndTime {get; set;}
    public string callbackUrl {get; set;}
    public string destinationReferenceCode {get; set;}
    public string sourceMobileNumber {get; set;}
    public string transactionStatus {get; set;}
    public float amount {get; set;}
    public string destinationEcocashReference {get; set;}
    public string clientMerchantCode {get; set;}
    public string clientMerchantNumber {get; set;}
    public string clienttransactionDate {get; set;}
    public string description {get; set;}
    public string currency {get; set;}
    public float paymentAmount {get; set;}    
    public string ecocashReference {get; set;}
    public string transactionstartTime {get; set;}
}