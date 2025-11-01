<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$config = [
    'webapp_url' => 'https://script.google.com/macros/s/AKfycbwJUBtbpucSJs7WS-66oQgbkeqhnfwg1SfzTQizt-Xkx5qh-Sn8u0zRVSSl6plAQtIW/exec'
];

function callGoogleAppsScript($url, $data = null) {
    $ch = curl_init();
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    curl_close($ch);
    
    return [
        'success' => $httpCode === 200,
        'data' => $response,
        'http_code' => $httpCode
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    if ($method === 'GET') {
        switch ($action) {
            case 'stats':
                $result = callGoogleAppsScript($config['webapp_url'] . '?action=stats');
                break;
                
            case 'recent':
                $result = callGoogleAppsScript($config['webapp_url'] . '?action=recent');
                break;
                
            case 'status':
                $ticketId = $_GET['ticketId'] ?? '';
                if ($ticketId) {
                    $result = callGoogleAppsScript($config['webapp_url'] . '?action=status&ticketId=' . urlencode($ticketId));
                } else {
                    throw new Exception('Ticket ID is required');
                }
                break;
                
            default:
                throw new Exception('Invalid action');
        }
    } else if ($method === 'POST') {
        // Handle form submission
        $postData = $_POST;
        $result = callGoogleAppsScript($config['webapp_url'], $postData);
    } else {
        throw new Exception('Method not allowed');
    }
    
    if ($result['success']) {
        echo $result['data'];
    } else {
        throw new Exception('Failed to call Google Apps Script: HTTP ' . $result['http_code']);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>