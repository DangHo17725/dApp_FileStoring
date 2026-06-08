import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';

export function useContractEvents() {
  const { contract, provider, networkInfo } = useWeb3();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Parse event to common format
  const parseEvent = useCallback((event, type) => {
    const baseEvent = {
      type,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      timestamp: null, // Will be filled from block
    };

    switch (type) {
      case 'CertificateIssued':
        return {
          ...baseEvent,
          certId: event.args.certId,
          certName: event.args.certName,
          issuer: event.args.issuer,
          recipient: event.args.recipient,
          documentHash: event.args.documentHash,
          issuedAt: event.args.issuedAt,
          expiresAt: event.args.expiresAt,
        };
      case 'CertificateRevoked':
        return {
          ...baseEvent,
          certId: event.args.certId,
          issuer: event.args.issuer,
          reason: event.args.reason,
          revokedAt: event.args.revokedAt,
        };
      case 'IssuerGranted':
        return {
          ...baseEvent,
          account: event.args.account,
          admin: event.args.admin,
        };
      case 'IssuerRevoked':
        return {
          ...baseEvent,
          account: event.args.account,
          admin: event.args.admin,
        };
      default:
        return baseEvent;
    }
  }, []);

  // Fetch all events
  const fetchEvents = useCallback(async () => {
    if (!contract || !provider) return;

    setIsLoading(true);
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10000 blocks

      const [issuedEvents, revokedEvents, grantedEvents, revokedIssuerEvents] = await Promise.all([
        contract.queryFilter(contract.filters.CertificateIssued(), fromBlock),
        contract.queryFilter(contract.filters.CertificateRevoked(), fromBlock),
        contract.queryFilter(contract.filters.IssuerGranted(), fromBlock),
        contract.queryFilter(contract.filters.IssuerRevoked(), fromBlock),
      ]);

      const allEvents = [
        ...issuedEvents.map(e => parseEvent(e, 'CertificateIssued')),
        ...revokedEvents.map(e => parseEvent(e, 'CertificateRevoked')),
        ...grantedEvents.map(e => parseEvent(e, 'IssuerGranted')),
        ...revokedIssuerEvents.map(e => parseEvent(e, 'IssuerRevoked')),
      ];

      // Add timestamps from blocks
      const eventsWithTimestamps = await Promise.all(
        allEvents.map(async (event) => {
          try {
            const block = await provider.getBlock(event.blockNumber);
            return { ...event, timestamp: block?.timestamp || null };
          } catch {
            return event;
          }
        })
      );

      // Sort by block number descending
      eventsWithTimestamps.sort((a, b) => b.blockNumber - a.blockNumber);

      setEvents(eventsWithTimestamps);
    } catch (error) {
      console.error('Fetch events error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [contract, provider, parseEvent]);

  // Listen for new events
  useEffect(() => {
    if (!contract) return;

    const handleCertificateIssued = (...args) => {
      const event = args[args.length - 1];
      const parsed = parseEvent(event, 'CertificateIssued');
      setEvents(prev => [parsed, ...prev]);
    };

    const handleCertificateRevoked = (...args) => {
      const event = args[args.length - 1];
      const parsed = parseEvent(event, 'CertificateRevoked');
      setEvents(prev => [parsed, ...prev]);
    };

    const handleIssuerGranted = (...args) => {
      const event = args[args.length - 1];
      const parsed = parseEvent(event, 'IssuerGranted');
      setEvents(prev => [parsed, ...prev]);
    };

    const handleIssuerRevoked = (...args) => {
      const event = args[args.length - 1];
      const parsed = parseEvent(event, 'IssuerRevoked');
      setEvents(prev => [parsed, ...prev]);
    };

    contract.on('CertificateIssued', handleCertificateIssued);
    contract.on('CertificateRevoked', handleCertificateRevoked);
    contract.on('IssuerGranted', handleIssuerGranted);
    contract.on('IssuerRevoked', handleIssuerRevoked);

    return () => {
      contract.off('CertificateIssued', handleCertificateIssued);
      contract.off('CertificateRevoked', handleCertificateRevoked);
      contract.off('IssuerGranted', handleIssuerGranted);
      contract.off('IssuerRevoked', handleIssuerRevoked);
    };
  }, [contract, parseEvent]);

  // Fetch on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filter events
  const getEventsByType = useCallback((type) => {
    return events.filter(e => e.type === type);
  }, [events]);

  const getEventsByCertId = useCallback((certId) => {
    return events.filter(e => e.certId === certId);
  }, [events]);

  const getEventsByAddress = useCallback((address) => {
    return events.filter(e =>
      e.issuer?.toLowerCase() === address.toLowerCase() ||
      e.recipient?.toLowerCase() === address.toLowerCase() ||
      e.account?.toLowerCase() === address.toLowerCase() ||
      e.admin?.toLowerCase() === address.toLowerCase()
    );
  }, [events]);

  return {
    events,
    isLoading,
    fetchEvents,
    getEventsByType,
    getEventsByCertId,
    getEventsByAddress,
  };
}
